/**
 * Collaboration Manager - Orchestrates agent execution
 */

import { eventBus, EVENTS } from '../../core/eventBus.js';
import { taskRouter } from './taskRouter.js';

export class CollaborationManager {
  constructor(agentRegistry) {
    this.agentRegistry = agentRegistry;
  }

  /**
   * Orchestrate agent execution
   */
  async orchestrate(agentNames, taskPayload, context) {
    const outputs = [];

    // Get execution order
    const orderedAgents = taskRouter.getExecutionOrder(agentNames);

    // Check if can run in parallel
    const canParallelize = taskRouter.canRunInParallel(orderedAgents);

    if (canParallelize) {
      return await this.executeParallel(orderedAgents, taskPayload, context);
    } else {
      return await this.executeSequential(orderedAgents, taskPayload, context);
    }
  }

  /**
   * Execute agents sequentially
   */
  async executeSequential(agentNames, taskPayload, context) {
    const outputs = [];

    for (const agentName of agentNames) {
      const agent = this.agentRegistry[agentName];
      if (!agent) {
        console.error(`Agent ${agentName} not found in registry`);
        continue;
      }

      try {
        await eventBus.emit(EVENTS.AGENT_START, { agentName });

        // Pass previous outputs as context
        const result = await agent.handle(taskPayload, {
          ...context,
          previous: outputs,
        });

        outputs.push({
          agent: agentName,
          result,
          timestamp: Date.now(),
        });

        await eventBus.emit(EVENTS.AGENT_COMPLETE, { agentName, result });
      } catch (error) {
        console.error(`Error in agent ${agentName}:`, error);
        await eventBus.emit(EVENTS.AGENT_ERROR, { agentName, error });

        outputs.push({
          agent: agentName,
          result: null,
          error: error.message,
          timestamp: Date.now(),
        });
      }
    }

    return outputs;
  }

  /**
   * Execute agents in parallel
   */
  async executeParallel(agentNames, taskPayload, context) {
    const promises = agentNames.map(async (agentName) => {
      const agent = this.agentRegistry[agentName];
      if (!agent) {
        throw new Error(`Agent ${agentName} not found`);
      }

      try {
        await eventBus.emit(EVENTS.AGENT_START, { agentName });

        const result = await agent.handle(taskPayload, context);

        await eventBus.emit(EVENTS.AGENT_COMPLETE, { agentName, result });

        return {
          agent: agentName,
          result,
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error(`Error in agent ${agentName}:`, error);
        await eventBus.emit(EVENTS.AGENT_ERROR, { agentName, error });

        return {
          agent: agentName,
          result: null,
          error: error.message,
          timestamp: Date.now(),
        };
      }
    });

    return await Promise.all(promises);
  }

  /**
   * Combine outputs from multiple agents
   */
  combineOutputs(outputs) {
    return outputs.reduce((acc, curr) => {
      acc[curr.agent] = curr.result;
      return acc;
    }, {});
  }

  /**
   * Extract insights from combined outputs
   */
  extractInsights(outputs) {
    const insights = {
      summary: [],
      recommendations: [],
      warnings: [],
      data: {},
    };

    for (const output of outputs) {
      if (!output.result) continue;

      const { agent, result } = output;

      // Extract summary
      if (result.summary) {
        insights.summary.push(`${agent}: ${result.summary}`);
      }

      // Extract recommendations
      if (result.recommendations) {
        insights.recommendations.push(...result.recommendations);
      }

      // Extract warnings
      if (result.warnings) {
        insights.warnings.push(...result.warnings);
      }

      // Store agent data
      insights.data[agent] = result;
    }

    return insights;
  }
}

export default CollaborationManager;

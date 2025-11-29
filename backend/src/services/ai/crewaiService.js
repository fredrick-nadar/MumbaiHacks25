const { spawn } = require('child_process');
const path = require('path');

class CrewAIPredictionService {
  constructor() {
    this.pythonPath = 'python'; // or 'python3' on some systems
    this.scriptPath = path.join(__dirname, '../../crewai-agents/agents.py');
  }

  /**
   * Run CrewAI prediction agents
   * @param {Array} transactions - Array of transaction objects
   * @returns {Promise<Object>} - Prediction results
   */
  async generatePredictions(transactions) {
    return new Promise((resolve, reject) => {
      // Prepare transaction data
      const transactionData = transactions.map(t => ({
        date: t.date,
        amount: t.amount,
        description: t.description || t.category || 'Uncategorized',
        type: t.type || (t.amount > 0 ? 'credit' : 'debit'),
        category: t.category || t.description || 'Uncategorized'
      }));

      console.log(`🤖 Starting CrewAI prediction with ${transactionData.length} transactions...`);

      // Spawn Python process
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath]);

      let outputData = '';
      let errorData = '';

      // Send transaction data to Python via stdin
      pythonProcess.stdin.write(JSON.stringify(transactionData));
      pythonProcess.stdin.end();

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.log('Python stderr:', data.toString());
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ CrewAI process failed:', errorData);
          reject(new Error(`Python process exited with code ${code}: ${errorData}`));
          return;
        }

        try {
          // Parse JSON output
          const result = JSON.parse(outputData);
          
          if (result.error) {
            console.error('❌ CrewAI error:', result.error);
            reject(new Error(result.error));
            return;
          }

          console.log('✅ CrewAI prediction completed successfully');
          resolve(result);
        } catch (parseError) {
          console.error('❌ Failed to parse Python output:', outputData);
          reject(new Error(`Failed to parse prediction output: ${parseError.message}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error('❌ Failed to start Python process:', error);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Check if Python and required packages are installed
   * @returns {Promise<Object>} - Status of Python environment
   */
  async checkPythonEnvironment() {
    return new Promise((resolve) => {
      const pythonProcess = spawn(this.pythonPath, ['-c', 'import crewai, pandas, sklearn; print("OK")']);

      let output = '';
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0 && output.includes('OK')) {
          resolve({ 
            status: 'ready', 
            message: 'CrewAI environment is ready' 
          });
        } else {
          resolve({ 
            status: 'not_ready', 
            message: 'CrewAI packages not installed. Run: pip install -r crewai-agents/requirements.txt',
            pythonPath: this.pythonPath
          });
        }
      });

      pythonProcess.on('error', () => {
        resolve({ 
          status: 'python_not_found', 
          message: 'Python not found. Please install Python 3.8+' 
        });
      });
    });
  }
}

module.exports = new CrewAIPredictionService();

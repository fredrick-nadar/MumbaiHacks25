import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Shield, Plus, CheckCircle2, AlertCircle, TrendingUp, Clock, FileText } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const InsuranceDashboard = () => {
  const { API_BASE } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [blockchainHealth, setBlockchainHealth] = useState(null);

  useEffect(() => {
    fetchInsuranceData();
    checkBlockchainHealth();
  }, []);

  const fetchInsuranceData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch overview
      const overviewRes = await fetch(`${API_BASE}/insurance/summary/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const overviewData = await overviewRes.json();
      
      // Fetch policies
      const policiesRes = await fetch(`${API_BASE}/insurance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const policiesData = await policiesRes.json();
      
      if (overviewData.status === 'success') {
        setOverview(overviewData.data);
      }
      
      if (policiesData.status === 'success') {
        setPolicies(policiesData.data.policies);
      }
      
    } catch (error) {
      console.error('Error fetching insurance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBlockchainHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/insurance/blockchain/health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setBlockchainHealth(data.data);
      }
    } catch (error) {
      console.error('Error checking blockchain health:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPolicyTypeColor = (type) => {
    const colors = {
      health: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      life: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      term: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      home: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      travel: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Insurance Policies
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Blockchain-verified insurance management
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Policy
        </Button>
      </div>

      {/* Blockchain Status */}
      {blockchainHealth && (
        <Card className="border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/20 dark:to-cyan-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  blockchainHealth.status === 'healthy' 
                    ? 'bg-emerald-500' 
                    : blockchainHealth.status === 'disabled'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}>
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Blockchain Status
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {blockchainHealth.status === 'disabled' 
                      ? 'Running without blockchain (all features available)'
                      : blockchainHealth.status === 'healthy'
                      ? `Connected to ${blockchainHealth.network || 'blockchain'}`
                      : 'Blockchain connection issues'}
                  </p>
                </div>
              </div>
              {blockchainHealth.contractDeployed && (
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Block Height</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                    {blockchainHealth.blockNumber?.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {overview.totalPolicies}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {overview.activePolicies} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(overview.totalCoverage)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Insured amount
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Premiums Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(overview.totalPremiumsPaid)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lifetime payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Blockchain Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                {overview.blockchain.totalOnChainRecords}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overview.blockchain.verifiedPolicies} verified
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Policies List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Your Policies
        </h2>
        
        {policies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                No insurance policies yet. Add your first policy to get started.
              </p>
              <Button className="mt-4">Add Policy</Button>
            </CardContent>
          </Card>
        ) : (
          policies.map((policy) => (
            <Card key={policy._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPolicyTypeColor(policy.policyType)}`}>
                        {policy.policyType.charAt(0).toUpperCase() + policy.policyType.slice(1)}
                      </span>
                      {policy.blockchainVerified && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Blockchain Verified
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        policy.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
                      }`}>
                        {policy.status}
                      </span>
                    </div>
                    <CardTitle className="text-lg">
                      {policy.provider} - {policy.policyNumber}
                    </CardTitle>
                    <CardDescription>
                      {policy.holderName}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Coverage</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(policy.coverageAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Premium</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(policy.premiumAmount)}
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                        /{policy.premiumFrequency}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Valid Until</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatDate(policy.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tax Benefit</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {policy.taxBenefit?.eligible ? `Section ${policy.taxBenefit.section}` : 'Not eligible'}
                    </p>
                  </div>
                </div>

                {policy.blockchainData?.transactionHash && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <FileText className="h-3 w-3" />
                      <span>Blockchain TX:</span>
                      <code className="font-mono text-sky-600 dark:text-sky-400">
                        {policy.blockchainData.transactionHash.substring(0, 10)}...
                        {policy.blockchainData.transactionHash.substring(policy.blockchainData.transactionHash.length - 8)}
                      </code>
                      {policy.blockchainData.verificationUrl && (
                        <a 
                          href={policy.blockchainData.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          Verify →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default InsuranceDashboard;

import React, { useState, useEffect } from 'react';
import { Shield, Plus, CheckCircle, AlertCircle, ExternalLink, RefreshCw, ChevronDown, ChevronUp, DollarSign, FileText } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';

const BlockchainInsurance = () => {
  const auth = useAuth();
  // Use the correct localStorage key from AuthContext
  const token = auth?.accessToken || localStorage.getItem('taxwise_token');
  const [policies, setPolicies] = useState([]);
  const [overview, setOverview] = useState(null);
  const [blockchainHealth, setBlockchainHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedPolicies, setExpandedPolicies] = useState({});

  console.log('Auth token:', token ? `Token exists (${token.substring(0, 20)}...)` : 'No token found');
  console.log('Auth status:', auth?.status);
  console.log('Auth user:', auth?.user?.email);

  const [newPolicy, setNewPolicy] = useState({
    policyNumber: '',
    policyType: 'health',
    provider: '',
    coverageAmount: '',
    premiumAmount: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchData();
    checkBlockchainHealth();
  }, []);

  const fetchData = async () => {
    if (!token) {
      console.error('No token available');
      setLoading(false);
      return;
    }

    try {
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      console.log('Fetching with token:', token.substring(0, 20) + '...');
      
      const [policiesRes, overviewRes] = await Promise.all([
        fetch('http://localhost:3001/api/insurance', { headers }),
        fetch('http://localhost:3001/api/insurance/summary/overview', { headers })
      ]);

      console.log('Policies response:', policiesRes.status);
      console.log('Overview response:', overviewRes.status);

      if (policiesRes.ok) {
        const policiesData = await policiesRes.json();
        console.log('Policies data:', policiesData);
        setPolicies(policiesData.data?.policies || []);
      } else {
        console.error('Policies fetch failed:', await policiesRes.text());
      }

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        console.log('Overview data:', overviewData);
        setOverview(overviewData.data || overviewData);
      } else {
        console.error('Overview fetch failed:', await overviewRes.text());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBlockchainHealth = async () => {
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:3001/api/insurance/blockchain/health', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Blockchain health response:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        setBlockchainHealth(data);
      } else {
        console.error('Blockchain health check failed:', await res.text());
      }
    } catch (error) {
      console.error('Error checking blockchain health:', error);
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    console.log('Creating policy...', newPolicy);
    
    try {
      const res = await fetch('http://localhost:3001/api/insurance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newPolicy,
          coverageAmount: parseFloat(newPolicy.coverageAmount),
          premiumAmount: parseFloat(newPolicy.premiumAmount)
        })
      });

      const data = await res.json();
      console.log('Create policy response:', data);
      console.log('Full response data:', JSON.stringify(data, null, 2));

      if (res.ok) {
        console.log('✅ Policy created successfully!');
        
        // Extract transaction hash from various possible locations
        const txHash = data.data?.blockchainData?.transactionHash || 
                       data.blockchainData?.transactionHash || 
                       data.data?.policy?.blockchainData?.transactionHash;
        
        const blockNum = data.data?.blockchainData?.blockNumber || 
                        data.blockchainData?.blockNumber || 
                        data.data?.policy?.blockchainData?.blockNumber;
        
        if (txHash) {
          alert(`✅ Policy Created on Blockchain!\n\nTransaction: ${txHash.slice(0, 20)}...${txHash.slice(-10)}\nBlock: #${blockNum || 'pending'}`);
        } else {
          alert('✅ Policy created successfully!');
        }
        
        setShowCreateForm(false);
        setNewPolicy({
          policyNumber: '',
          policyType: 'health',
          provider: '',
          coverageAmount: '',
          premiumAmount: '',
          startDate: '',
          endDate: ''
        });
        
        // Refresh data
        console.log('Refreshing data...');
        await fetchData();
        await checkBlockchainHealth();
        console.log('Data refreshed!');
      } else {
        console.error('Failed to create policy:', data);
        alert(`Failed to create policy: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating policy:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const getPolicyTypeColor = (type) => {
    const colors = {
      health: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      life: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      motor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      property: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      travel: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    };
    return colors[type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Blockchain Insurance
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Immutable insurance records on blockchain
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              setLoading(true);
              await fetchData();
              await checkBlockchainHealth();
              setLoading(false);
            }}
            variant="outline"
            className="border-sky-500/20"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-sky-500 to-emerald-500 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Blockchain Status */}
      {blockchainHealth && (
        <Card className="border-white/10 bg-white/80 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-sky-500" />
              Blockchain Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Network</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {blockchainHealth.network || 'localhost'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Chain ID</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {blockchainHealth.chainId || '31337'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Contract</span>
                <span className="flex items-center gap-2 font-mono text-xs text-slate-900 dark:text-white">
                  {blockchainHealth.contractAddress?.slice(0, 6)}...{blockchainHealth.contractAddress?.slice(-4)}
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-white/10 bg-white/80 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Policies</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {overview.totalPolicies || 0}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-sky-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/80 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Coverage</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ₹{(overview.totalCoverage || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/80 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Premiums Paid</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ₹{(overview.totalPremiumsPaid || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-cyan-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-gradient-to-br from-sky-500/10 to-emerald-500/10 backdrop-blur-xl dark:border-slate-700/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">On Blockchain</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {overview.blockchainRecords || 0}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-sky-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-white/10 bg-white/80 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle>Create New Insurance Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Policy Number</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border bg-white/50 px-4 py-2 text-sm dark:bg-slate-800/50"
                    value={newPolicy.policyNumber}
                    onChange={(e) => setNewPolicy({...newPolicy, policyNumber: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Policy Type</label>
                  <select
                    className="w-full rounded-lg border bg-white/50 px-4 py-2 text-sm dark:bg-slate-800/50"
                    value={newPolicy.policyType}
                    onChange={(e) => setNewPolicy({...newPolicy, policyType: e.target.value})}
                  >
                    <option value="health">Health</option>
                    <option value="life">Life</option>
                    <option value="motor">Motor</option>
                    <option value="property">Property</option>
                    <option value="travel">Travel</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Provider</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border bg-white/50 px-4 py-2 text-sm dark:bg-slate-800/50"
                    value={newPolicy.provider}
                    onChange={(e) => setNewPolicy({...newPolicy, provider: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Coverage Amount (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border bg-white/50 px-4 py-2 text-sm dark:bg-slate-800/50"
                    value={newPolicy.coverageAmount}
                    onChange={(e) => setNewPolicy({...newPolicy, coverageAmount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Premium Amount (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border bg-white/50 px-4 py-2 text-sm dark:bg-slate-800/50"
                    value={newPolicy.premiumAmount}
                    onChange={(e) => setNewPolicy({...newPolicy, premiumAmount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border bg-white/50 px-4 py-2 text-sm dark:bg-slate-800/50"
                    value={newPolicy.startDate}
                    onChange={(e) => setNewPolicy({...newPolicy, startDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border bg-white/50 px-4 py-2 text-sm dark:bg-slate-800/50"
                    value={newPolicy.endDate}
                    onChange={(e) => setNewPolicy({...newPolicy, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-gradient-to-r from-sky-500 to-emerald-500 text-white">
                  Create Policy
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Policies List */}
      <div className="grid gap-4 md:grid-cols-2">
        {policies.map((policy) => (
          <Card key={policy._id} className="border-white/10 bg-white/80 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getPolicyTypeColor(policy.policyType)}`}>
                      {policy.policyType.toUpperCase()}
                    </span>
                    {policy.blockchainData?.isOnChain && (
                      <CheckCircle className="h-4 w-4 text-emerald-500" title="Verified on Blockchain" />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-mono text-slate-600 dark:text-slate-400">
                    {policy.policyNumber}
                  </p>
                </div>
                <Shield className="h-6 w-6 text-sky-500" />
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Provider</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{policy.provider}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Coverage</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      ₹{policy.coverageAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Premium</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      ₹{policy.premiumAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {policy.blockchainData?.transactionHash && (
                  <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <p className="mb-1 text-xs text-slate-600 dark:text-slate-400">Blockchain Verified</p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        {policy.blockchainData.transactionHash.slice(0, 10)}...{policy.blockchainData.transactionHash.slice(-8)}
                      </p>
                      <ExternalLink className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Block #{policy.blockchainData.blockNumber}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="flex-1 border-sky-500/20 text-sky-600 hover:bg-sky-500/10"
                    onClick={async () => {
                      const amount = prompt('Enter premium amount to pay:', policy.premiumAmount);
                      if (amount) {
                        try {
                          const res = await fetch(`http://localhost:3001/api/insurance/${policy._id}/payment`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              amount: parseFloat(amount),
                              paymentDate: new Date().toISOString(),
                              paymentMethod: 'online',
                              transactionId: `PAY-${Date.now()}`
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert(`✅ Premium Payment Recorded on Blockchain!\n\nTransaction: ${data.data?.blockchain?.transactionHash?.slice(0,20)}...`);
                            fetchData();
                          } else {
                            alert(`Failed: ${data.message}`);
                          }
                        } catch (error) {
                          alert(`Error: ${error.message}`);
                        }
                      }
                    }}
                  >
                    💳 Pay Premium
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="flex-1 border-orange-500/20 text-orange-600 hover:bg-orange-500/10"
                    onClick={async () => {
                      const amount = prompt('Enter claim amount:', '10000');
                      if (amount) {
                        try {
                          const res = await fetch(`http://localhost:3001/api/insurance/${policy._id}/claim`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              claimAmount: parseFloat(amount),
                              claimType: 'medical',
                              description: 'Medical claim'
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert(`✅ Claim Submitted to Blockchain!\n\nTransaction: ${data.data?.blockchain?.transactionHash?.slice(0,20)}...`);
                            fetchData();
                          } else {
                            alert(`Failed: ${data.message}`);
                          }
                        } catch (error) {
                          alert(`Error: ${error.message}`);
                        }
                      }
                    }}
                  >
                    🏥 Submit Claim
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="w-full border-slate-500/20"
                    onClick={() => setExpandedPolicies(prev => ({...prev, [policy._id]: !prev[policy._id]}))}
                  >
                    {expandedPolicies[policy._id] ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                    {expandedPolicies[policy._id] ? 'Hide' : 'View'} Transaction History
                  </Button>
                </div>

                {/* Transaction History (Expandable) */}
                {expandedPolicies[policy._id] && (
                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      📜 Blockchain Transaction History
                    </h4>
                    
                    {/* Premium Payments */}
                    {policy.premiumPayments && policy.premiumPayments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">💳 Premium Payments</p>
                        {policy.premiumPayments.map((payment, idx) => (
                          <div key={idx} className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {new Date(payment.paymentDate).toLocaleDateString()}
                                </p>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  ₹{payment.amount.toLocaleString('en-IN')}
                                </p>
                              </div>
                              <DollarSign className="h-4 w-4 text-sky-500" />
                            </div>
                            {payment.blockchainPayment?.transactionHash && (
                              <a
                                href={`https://amoy.polygonscan.com/tx/${payment.blockchainPayment.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400"
                              >
                                <span className="font-mono">
                                  {payment.blockchainPayment.transactionHash.slice(0, 10)}...
                                  {payment.blockchainPayment.transactionHash.slice(-8)}
                                </span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {payment.blockchainPayment?.blockNumber && (
                              <p className="mt-1 text-xs text-slate-500">
                                Block #{payment.blockchainPayment.blockNumber}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Claims */}
                    {policy.claims && policy.claims.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">🏥 Claims</p>
                        {policy.claims.map((claim, idx) => (
                          <div key={idx} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {new Date(claim.claimDate).toLocaleDateString()}
                                </p>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  ₹{claim.claimAmount.toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  Status: <span className="font-medium">{claim.status}</span>
                                </p>
                              </div>
                              <FileText className="h-4 w-4 text-orange-500" />
                            </div>
                            {claim.blockchainClaim?.transactionHash && (
                              <a
                                href={`https://amoy.polygonscan.com/tx/${claim.blockchainClaim.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400"
                              >
                                <span className="font-mono">
                                  {claim.blockchainClaim.transactionHash.slice(0, 10)}...
                                  {claim.blockchainClaim.transactionHash.slice(-8)}
                                </span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {claim.blockchainClaim?.blockNumber && (
                              <p className="mt-1 text-xs text-slate-500">
                                Block #{claim.blockchainClaim.blockNumber}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {(!policy.premiumPayments || policy.premiumPayments.length === 0) && 
                     (!policy.claims || policy.claims.length === 0) && (
                      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                        No transactions yet. Click "Pay Premium" or "Submit Claim" to create blockchain transactions.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Explanation Card */}
      <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-emerald-500/10 backdrop-blur-xl dark:border-slate-700/60">
        <CardContent className="p-6">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Shield className="h-5 w-5 text-sky-500" />
            What is a Smart Contract?
          </h3>
          <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">
            A <strong>smart contract</strong> is like a digital vending machine: when you meet certain conditions (like inserting money), 
            it automatically executes an action (dispenses soda). Your insurance policies are recorded on blockchain using smart contracts, 
            making them:
          </p>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span><strong>Immutable:</strong> Once recorded, cannot be altered or deleted</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span><strong>Transparent:</strong> Anyone can verify the authenticity</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span><strong>Tax Proof:</strong> Cryptographic proof of premiums paid for tax deductions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span><strong>No Middleman:</strong> Direct verification without third parties</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockchainInsurance;

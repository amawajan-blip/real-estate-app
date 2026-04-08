import { useState, useEffect, useCallback } from 'react';
import api from '../services/electronService';

/**
 * Generic hook for loading data from electron DB.
 * @param {Function} fetcher - async function that returns data
 * @param {Array} deps - re-fetch when these change
 */
export function useData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err) {
      console.error('[useData] Error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}

// ─── Properties ───────────────────────────────────────────────────────────────
export function useProperties() {
  const { data: properties, loading, error, refresh } = useData(() => api.properties.getAll());

  const createProperty = async (data) => {
    const result = await api.properties.create(data);
    await refresh();
    return result;
  };

  const updateProperty = async (id, data) => {
    const result = await api.properties.update(id, data);
    await refresh();
    return result;
  };

  const deleteProperty = async (id) => {
    await api.properties.delete(id);
    await refresh();
  };

  return { properties: properties || [], loading, error, refresh, createProperty, updateProperty, deleteProperty };
}

// ─── Tenants ──────────────────────────────────────────────────────────────────
export function useTenants() {
  const { data: tenants, loading, error, refresh } = useData(() => api.tenants.getAll());

  const createTenant = async (data) => {
    const result = await api.tenants.create(data);
    await refresh();
    return result;
  };

  const updateTenant = async (id, data) => {
    const result = await api.tenants.update(id, data);
    await refresh();
    return result;
  };

  const deleteTenant = async (id) => {
    await api.tenants.delete(id);
    await refresh();
  };

  return { tenants: tenants || [], loading, error, refresh, createTenant, updateTenant, deleteTenant };
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export function usePayments() {
  const { data: payments, loading, error, refresh } = useData(() => api.payments.getAll());

  const createPayment = async (data) => {
    const result = await api.payments.create(data);
    await refresh();
    return result;
  };

  const updatePayment = async (id, data) => {
    const result = await api.payments.update(id, data);
    await refresh();
    return result;
  };

  const deletePayment = async (id) => {
    await api.payments.delete(id);
    await refresh();
  };

  return { payments: payments || [], loading, error, refresh, createPayment, updatePayment, deletePayment };
}

// ─── Contracts ────────────────────────────────────────────────────────────────
export function useContracts() {
  const { data: contracts, loading, error, refresh } = useData(() => api.contracts.getAll());

  const createContract = async (data) => {
    const result = await api.contracts.create(data);
    await refresh();
    return result;
  };

  const updateContract = async (id, data) => {
    const result = await api.contracts.update(id, data);
    await refresh();
    return result;
  };

  const deleteContract = async (id) => {
    await api.contracts.delete(id);
    await refresh();
  };

  return { contracts: contracts || [], loading, error, refresh, createContract, updateContract, deleteContract };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function useDashboard() {
  return useData(() => api.dashboard.getStats());
}

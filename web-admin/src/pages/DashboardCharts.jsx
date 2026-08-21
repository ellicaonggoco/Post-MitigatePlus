import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';

export function SuperAdminCityChart({ data }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="district" stroke="var(--ink-soft)" fontSize={11} tickLine={false} />
          <YAxis stroke="var(--ink-soft)" fontSize={11} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 10, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="Beneficiaries" fill="var(--manila-blue)" radius={[6, 6, 0, 0]} barSize={14} isAnimationActive={false} />
          <Bar dataKey="Relief" fill="var(--bay-teal)" radius={[6, 6, 0, 0]} barSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LguAdminReliefChart({ data }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" stroke="var(--ink-soft)" fontSize={11} tickLine={false} />
          <YAxis stroke="var(--ink-soft)" fontSize={11} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 10, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="Target" fill="var(--manila-blue)" radius={[6, 6, 0, 0]} barSize={14} isAnimationActive={false} />
          <Bar dataKey="Distributed" fill="var(--bay-teal)" radius={[6, 6, 0, 0]} barSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarangayRecoveryPieChart({ data }) {
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" isAnimationActive={false}>
            {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 10, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardCharts() {
  return null;
}

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';

const WorkReportsDashboardFixed: React.FC<{ hideAllMembersReports?: boolean }> = ({ hideAllMembersReports }) => {
  const { user } = useAuth();
  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Work Reports</h1>
          <p className="text-slate-600">Temporary simplified view to restore app while we repair the full dashboard.</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-slate-700">
          {user ? (
            hideAllMembersReports || user.role === UserRole.EMPLOYEE
              ? 'You are viewing your personal Work Reports. Full calendar and analytics will return shortly.'
              : 'You are viewing the Work Reports dashboard. Full team calendar and analytics will return shortly.'
          ) : (
            'Please sign in.'
          )}
        </p>
      </div>
    </div>
  );
};

export default WorkReportsDashboardFixed;

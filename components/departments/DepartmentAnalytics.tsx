import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import { Company, Department, Project, Task, TaskStatus, User, UserRole } from '../../types';
import ProjectCard from '../projects/ProjectCard';

const DepartmentAnalytics: React.FC = () => {
  const { departmentId } = useParams<{ departmentId: string }>();

  const [department, setDepartment] = useState<Department | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('All');
  const [taskSearch, setTaskSearch] = useState<string>('');
  const [projectView, setProjectView] = useState<'card' | 'table'>('card');

  const loadData = useCallback(async () => {
    if (!departmentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const dept = await DataService.getDepartmentById(departmentId);
      if (!dept) {
        setDepartment(null);
        setLoading(false);
        return;
      }
      setDepartment(dept);

      const [companiesFetched, allUsers, allProjects, allTasks, deptsFetched] = await Promise.all([
        DataService.getCompanies(),
        DataService.getUsers(),
        DataService.getAllProjects(),
        DataService.getAllTasks(),
        DataService.getDepartments(),
      ]);

      setAllCompanies(companiesFetched);
      setAllDepartments(deptsFetched);

      const comp = companiesFetched.find(c => c.id === dept.companyId) || null;
      setCompany(comp);

      const usersInDept = allUsers.filter(u => Array.isArray(u.departmentIds) && u.departmentIds.includes(dept.id));
      setEmployees(usersInDept.filter(u => u.role === UserRole.EMPLOYEE));
      setManagers(usersInDept.filter(u => u.role === UserRole.MANAGER));

      const deptProjects = allProjects.filter(p => Array.isArray(p.departmentIds) && p.departmentIds.includes(dept.id));
      setProjects(deptProjects);

      const projectIds = new Set(deptProjects.map(p => p.id));
      const deptTasks = allTasks.filter(t => projectIds.has(t.projectId));
      setTasks(deptTasks);
    } catch (e) {
      console.error('Failed to load department analytics', e);
      setDepartment(null);
      setCompany(null);
      setEmployees([]);
      setManagers([]);
      setProjects([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const statusCounts: Record<string, number> = { 'Completed': 0, 'In Progress': 0, 'On Hold': 0, 'Pending': 0, 'To-Do': 0, 'Overdue': 0 };
    for (const t of tasks) {
      const s = t.status;
      if (s === TaskStatus.COMPLETED) statusCounts['Completed']++;
      else if (s === TaskStatus.IN_PROGRESS) statusCounts['In Progress']++;
      else if (s === TaskStatus.ON_HOLD) statusCounts['On Hold']++;
      else if (s === TaskStatus.TODO) statusCounts['To-Do']++;
    }
    return {
      employeeCount: employees.length,
      managerCount: managers.length,
      projectCount: projects.length,
      taskCount: tasks.length,
      taskStatus: statusCounts,
    };
  }, [employees.length, managers.length, projects.length, tasks]);

  // Build display data for ProjectCard requirements
  const projectDisplay = useMemo(() => {
    return projects.map((p) => {
      const projectTasks = tasks.filter(t => t.projectId === p.id);
      let progress = 0;
      if (p.roadmap && p.roadmap.length > 0) {
        const total = p.roadmap.length;
        const completed = p.roadmap.filter(m => m.status === 'Completed').length;
        const inProgress = p.roadmap.filter(m => m.status === 'In Progress').length;
        progress = total > 0 ? Math.round(((completed * 1.0 + inProgress * 0.5) / total) * 100) : 0;
      } else if (projectTasks.length > 0) {
        const done = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
        progress = Math.round((done / projectTasks.length) * 100);
      }

      const departmentNames = (p.departmentIds || [])
        .map(id => allDepartments.find(d => d.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      const companyName = allCompanies.find(c => c.id === p.companyId)?.name;

      return { project: p, progress, departmentNames, companyName };
    });
  }, [projects, tasks, allDepartments, allCompanies]);

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return tasks.filter(t => {
      const statusOk = taskStatusFilter === 'All' || t.status === taskStatusFilter;
      const queryOk = !q || t.name.toLowerCase().includes(q);
      return statusOk && queryOk;
    });
  }, [tasks, taskStatusFilter, taskSearch]);

  if (loading) return <div className="text-center p-8">Loading analytics...</div>;
  if (!department) return <div className="text-center p-8">Department not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{department.name} Analytics</h1>
          {company && (
            <p className="text-slate-500 mt-1">Company: <span className="font-medium text-slate-700">{company.name}</span></p>
          )}
        </div>
        <Link to="/departments" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Back to Departments</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-slate-500 text-sm">Employees</div>
          <div className="text-3xl font-bold text-slate-800">{stats.employeeCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-slate-500 text-sm">Managers</div>
          <div className="text-3xl font-bold text-slate-800">{stats.managerCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-slate-500 text-sm">Projects</div>
          <div className="text-3xl font-bold text-slate-800">{stats.projectCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-slate-500 text-sm">Tasks</div>
          <div className="text-3xl font-bold text-slate-800">{stats.taskCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Projects</h2>
              <div className="inline-flex rounded-md overflow-hidden border border-slate-300">
                <button onClick={() => setProjectView('card')} className={`px-3 py-1 text-sm ${projectView==='card' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Cards</button>
                <button onClick={() => setProjectView('table')} className={`px-3 py-1 text-sm border-l border-slate-300 ${projectView==='table' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Table</button>
              </div>
            </div>
            {projectDisplay.length > 0 ? (
              projectView === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {projectDisplay.map(pd => (
                    <ProjectCard key={pd.project.id} project={pd.project} progress={pd.progress} departmentNames={pd.departmentNames} companyName={pd.companyName} />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Company</th>
                        <th className="py-2 pr-4">Departments</th>
                        <th className="py-2 pr-4">Progress</th>
                        <th className="py-2 pr-4">Deadline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectDisplay.map(pd => (
                        <tr key={pd.project.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 text-slate-800 truncate max-w-[260px]"><Link className="text-indigo-600 hover:text-indigo-700" to={`/projects/${pd.project.id}`}>{pd.project.name}</Link></td>
                          <td className="py-2 pr-4 text-slate-600 truncate max-w-[180px]">{pd.companyName || '—'}</td>
                          <td className="py-2 pr-4 text-slate-600 truncate max-w-[260px]">{pd.departmentNames || '—'}</td>
                          <td className="py-2 pr-4 text-slate-800">{pd.progress}%</td>
                          <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{pd.project.deadline ? new Date(pd.project.deadline).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="text-slate-500">No projects under this department.</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Tasks</h2>
              <div className="flex items-center gap-2">
                <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)} className="px-2 py-1 border border-slate-300 rounded-md text-sm">
                  <option>All</option>
                  <option>{TaskStatus.TODO}</option>
                  <option>{TaskStatus.IN_PROGRESS}</option>
                  <option>{TaskStatus.ON_HOLD}</option>
                  <option>{TaskStatus.COMPLETED}</option>
                </select>
                <input value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} placeholder="Search tasks..." className="px-2 py-1 border border-slate-300 rounded-md text-sm" />
              </div>
            </div>
            {filteredTasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Project</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(t => {
                      const proj = projects.find(p => p.id === t.projectId);
                      return (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 text-slate-800 truncate max-w-[260px]"><Link className="text-indigo-600 hover:text-indigo-700" to={`/tasks/${t.id}`}>{t.name}</Link></td>
                          <td className="py-2 pr-4 text-slate-600 truncate max-w-[220px]">{proj?.name || '—'}</td>
                          <td className="py-2 pr-4">
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{t.status}</span>
                          </td>
                          <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{t.dueDate || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-slate-500">No tasks match filters.</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Task Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Completed</span><span className="font-semibold text-green-600">{stats.taskStatus['Completed']}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">In Progress</span><span className="font-semibold text-blue-600">{stats.taskStatus['In Progress']}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">On Hold</span><span className="font-semibold text-yellow-600">{stats.taskStatus['On Hold']}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">To-Do</span><span className="font-semibold text-slate-700">{stats.taskStatus['To-Do']}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">Managers</h2>
            {managers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {managers.map(m => (
                  <Link key={m.id} to={`/users/${m.id}`} className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 truncate">
                    {m.name}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 text-sm">No managers assigned.</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">Employees</h2>
            {employees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {employees.map(e => (
                  <Link key={e.id} to={`/users/${e.id}`} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 truncate">
                    {e.name}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 text-sm">No employees in this department.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentAnalytics;

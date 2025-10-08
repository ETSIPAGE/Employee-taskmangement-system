import React from 'react';

interface ViewSwitcherProps {
  view: 'card' | 'table';
  setView: (view: 'card' | 'table') => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ view, setView }) => {
  return (
    <div className="flex bg-slate-200 rounded-lg p-1">
      <button
        onClick={() => setView('card')}
        className={`px-4 py-1.5 text-sm font-semibold rounded-md w-full transition-colors ${
          view === 'card' ? 'bg-white text-slate-800 shadow' : 'bg-transparent text-slate-600 hover:bg-slate-300'
        }`}
      >
        Card View
      </button>
      <button
        onClick={() => setView('table')}
        className={`px-4 py-1.5 text-sm font-semibold rounded-md w-full transition-colors ${
          view === 'table' ? 'bg-white text-slate-800 shadow' : 'bg-transparent text-slate-600 hover:bg-slate-300'
        }`}
      >
        Table View
      </button>
    </div>
  );
};

export default ViewSwitcher;

import React from 'react';
import { useData } from '../contexts/DataContext';

const DebugPanel: React.FC = () => {
  const { cuttingOperations, cultivationCycles, modules } = useData();

  const handleTestDelete = () => {
    if (cuttingOperations.length > 0) {
      const op = cuttingOperations[0];
      console.log('=== BEFORE DELETE ===');
      console.log('Operation:', op);
      console.log('All cycles:', cultivationCycles.length);
      console.log('Cycles for this operation:', cultivationCycles.filter(c => c.cuttingOperationId === op.id));
      console.log('Modules:', modules.filter(m => m.farmerId !== undefined).map(m => ({ id: m.id, code: m.code, farmerId: m.farmerId })));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border-2 border-blue-500 max-w-md">
      <h3 className="font-bold text-lg mb-2">🔍 Debug Panel</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Cutting Operations:</strong> {cuttingOperations.length}
        </div>
        <div>
          <strong>Cultivation Cycles:</strong> {cultivationCycles.length}
        </div>
        <div>
          <strong>Modules (assigned):</strong> {modules.filter(m => m.farmerId !== undefined).length}
        </div>
        <div>
          <strong>Modules (free):</strong> {modules.filter(m => m.farmerId === undefined).length}
        </div>
      </div>

      <button
        onClick={handleTestDelete}
        className="mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Log Current State
      </button>

      <div className="mt-3 text-xs">
        <strong>Recent Cutting Ops:</strong>
        {cuttingOperations.slice(0, 3).map(op => (
          <div key={op.id} className="mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
            <div>ID: {op.id.substring(0, 8)}...</div>
            <div>Modules: {op.moduleCuts.map(mc => mc.moduleId.substring(0, 6)).join(', ')}</div>
            <div>
              Cycles: {cultivationCycles.filter(c => c.cuttingOperationId === op.id).length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugPanel;

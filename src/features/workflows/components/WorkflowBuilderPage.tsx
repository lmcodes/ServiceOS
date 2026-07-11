import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, ArrowUp, ArrowDown, Save, Sliders, AlertTriangle, 
  Settings2, ShieldAlert, Clock, FileText, UserCheck, HelpCircle
} from 'lucide-react';
import { WorkflowStage, WorkflowStageGuard } from '@/types/firestore';
import { useAuth } from '@/context/AuthContext';
import { 
  createWorkflow, 
  updateWorkflow, 
  getWorkflowWithStages 
} from '../repository/workflowRepository';

interface WorkflowBuilderPageProps {
  workflowId: string | null;
  onClose: () => void;
}

export const WorkflowBuilderPage: React.FC<WorkflowBuilderPageProps> = ({
  workflowId,
  onClose
}) => {
  const { user } = useAuth();

  // General States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allowCustomTransitions, setAllowCustomTransitions] = useState(false);
  
  // Stages List State
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null);

  // Indicators
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing workflow details if editing
  useEffect(() => {
    if (!workflowId) {
      // Default initial stage for new workflows
      setStages([
        {
          id: `stage_0_${Date.now()}`,
          name: 'Stage 1',
          allowedResourceTypes: [],
          transitionRules: { nextStages: [], allowSkip: false, allowRevert: false },
          guards: []
        }
      ]);
      setSelectedStageIndex(0);
      return;
    }

    const loadWorkflow = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getWorkflowWithStages(workflowId);
        if (data) {
          setName(data.workflow.name);
          setDescription(data.workflow.description || '');
          setAllowCustomTransitions(data.workflow.allowCustomTransitions);
          setStages(data.stages);
          if (data.stages.length > 0) {
            setSelectedStageIndex(0);
          }
        }
      } catch (err: any) {
        console.error('Failed to load workflow template:', err);
        setError('Failed to load workflow details.');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId]);

  // Stage Operations
  const handleAddStage = () => {
    const newStageId = `stage_${stages.length}_${Date.now()}`;
    const newStage: WorkflowStage = {
      id: newStageId,
      name: `Stage ${stages.length + 1}`,
      allowedResourceTypes: [],
      transitionRules: { nextStages: [], allowSkip: false, allowRevert: false },
      guards: []
    };
    
    setStages(prev => [...prev, newStage]);
    setSelectedStageIndex(stages.length);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      alert('A workflow must have at least one stage.');
      return;
    }
    const stageIdToRemove = stages[index].id;
    
    // Clean up references to this stage in transitionRules.nextStages
    const cleanedStages = stages.map(s => ({
      ...s,
      transitionRules: {
        ...s.transitionRules,
        nextStages: s.transitionRules.nextStages.filter(id => id !== stageIdToRemove)
      }
    })).filter((_, i) => i !== index);

    setStages(cleanedStages);
    
    // Re-adjust selected index
    if (selectedStageIndex === index) {
      setSelectedStageIndex(Math.max(0, index - 1));
    } else if (selectedStageIndex !== null && selectedStageIndex > index) {
      setSelectedStageIndex(selectedStageIndex - 1);
    }
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedStages = [...stages];
    
    // Swap
    const temp = updatedStages[index];
    updatedStages[index] = updatedStages[newIndex];
    updatedStages[newIndex] = temp;

    setStages(updatedStages);
    setSelectedStageIndex(newIndex);
  };

  const handleStageFieldChange = (index: number, field: keyof WorkflowStage, value: any) => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleTransitionRulesChange = (index: number, ruleField: string, value: any) => {
    setStages(prev => prev.map((s, i) => {
      if (i === index) {
        return {
          ...s,
          transitionRules: {
            ...s.transitionRules,
            [ruleField]: value
          }
        };
      }
      return s;
    }));
  };

  // Guard Operations
  const handleAddGuard = (stageIndex: number) => {
    const newGuard: WorkflowStageGuard = {
      type: 'customDataPresent',
      field: ''
    };
    
    setStages(prev => prev.map((s, i) => {
      if (i === stageIndex) {
        return {
          ...s,
          guards: [...(s.guards || []), newGuard]
        };
      }
      return s;
    }));
  };

  const handleRemoveGuard = (stageIndex: number, guardIndex: number) => {
    setStages(prev => prev.map((s, i) => {
      if (i === stageIndex) {
        return {
          ...s,
          guards: s.guards.filter((_, gIdx) => gIdx !== guardIndex)
        };
      }
      return s;
    }));
  };

  const handleGuardChange = (stageIndex: number, guardIndex: number, updatedGuard: WorkflowStageGuard) => {
    setStages(prev => prev.map((s, i) => {
      if (i === stageIndex) {
        return {
          ...s,
          guards: s.guards.map((g, gIdx) => gIdx === guardIndex ? updatedGuard : g)
        };
      }
      return s;
    }));
  };

  // Save/Submit Form
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) return;

    if (!name.trim()) {
      setError('Workflow Name is required.');
      return;
    }

    // Validate stage names
    const emptyStageName = stages.some(s => !s.name.trim());
    if (emptyStageName) {
      setError('All stages must have a name.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (workflowId) {
        await updateWorkflow(workflowId, user.tenantId, {
          name,
          description,
          allowCustomTransitions,
          stages
        });
      } else {
        await createWorkflow(user.tenantId, {
          name,
          description,
          allowCustomTransitions,
          stages
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save workflow template:', err);
      setError(err?.message || 'Failed to save workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  const Loader2 = ({ className }: { className?: string }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <span className="ml-3 text-sm text-slate-500 font-medium">Loading template details...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {workflowId ? 'Edit Workflow Template' : 'Create Workflow Template'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Design chronological stages, rules, and entry conditions for multi-step service queues.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-105 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-955/30 border border-red-200 dark:border-red-900 text-red-750 dark:text-red-300 text-sm rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Basic template configurations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Workflow Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Patient Vitals + Consultation + Pharmacy"
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl text-slate-905 dark:text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-inner"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly explain the purpose of this workflow..."
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl text-slate-905 dark:text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none resize-none shadow-inner"
              />
            </div>
          </div>

          <div className="p-5 bg-slate-50/50 dark:bg-slate-955/15 border border-slate-200/60 dark:border-slate-800 rounded-2xl space-y-4 h-fit">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-brand-655" />
              Workflow Rules
            </h4>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Custom Transitions
                </span>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Allow staff to transition ticket to any stage, skipping normal flow.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={allowCustomTransitions}
                  onChange={(e) => setAllowCustomTransitions(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all dark:border-slate-600 peer-checked:bg-brand-655 cursor-pointer"></div>
              </label>
            </div>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800/80" />

        {/* Builder Area: Stages List Sidebar + Settings Form Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[400px]">
          
          {/* Chronological Stages Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Chronological Stages ({stages.length})
              </h3>
              <button
                type="button"
                onClick={handleAddStage}
                className="flex items-center gap-1 py-1 px-2.5 bg-brand-50 dark:bg-brand-950/20 text-brand-655 border border-brand-100 dark:border-brand-900/40 hover:bg-brand-100 dark:hover:bg-brand-900/35 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Stage
              </button>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  onClick={() => setSelectedStageIndex(index)}
                  className={`p-3.5 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                    selectedStageIndex === index
                      ? 'border-brand-600 bg-brand-50/20 dark:bg-brand-955/5 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-950/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-850 dark:text-white truncate">
                        {stage.name || 'Unnamed Stage'}
                      </p>
                      {stage.transitionRules?.nextStages?.length > 0 && (
                        <span className="text-[9px] text-slate-450 font-medium">
                          Next: {stage.transitionRules.nextStages.length} route(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveStage(index, 'up')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === stages.length - 1}
                      onClick={() => handleMoveStage(index, 'down')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(index)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-955/20 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage Detail Form Settings */}
          <div className="lg:col-span-2 bg-slate-50/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 space-y-6">
            {selectedStageIndex !== null && stages[selectedStageIndex] ? (
              (() => {
                const currentStage = stages[selectedStageIndex];
                
                return (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    
                    {/* Stage Title details */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-brand-655" />
                        Configure Stage {selectedStageIndex + 1}: {currentStage.name}
                      </h4>
                      <span className="text-[10px] text-brand-655 dark:text-brand-400 font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-955/30 border border-brand-100 dark:border-brand-900/40 px-2 py-0.5 rounded-lg">
                        Stage ID: {currentStage.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                          Stage Name
                        </label>
                        <input
                          type="text"
                          value={currentStage.name}
                          onChange={(e) => handleStageFieldChange(selectedStageIndex, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500"
                          placeholder="e.g. Doctor Screening"
                        />
                      </div>

                      {/* Allowed Resources input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          Allowed Roles
                          <span title="Comma-separated roles allowed to service this stage (e.g. staff, doctor, nurse)"><HelpCircle className="w-3.5 h-3.5 text-slate-400" /></span>
                        </label>
                        <input
                          type="text"
                          value={currentStage.allowedResourceTypes?.join(', ') || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const arr = val.split(',').map(s => s.trim()).filter(Boolean);
                            handleStageFieldChange(selectedStageIndex, 'allowedResourceTypes', arr);
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500"
                          placeholder="e.g. nurse, doctor, staff"
                        />
                      </div>
                    </div>

                    {/* Transition rules panel */}
                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 space-y-4">
                      <h5 className="text-xs font-bold text-slate-850 dark:text-white">
                        Transition Rules (Successor Stages)
                      </h5>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`allow-skip-${currentStage.id}`}
                            checked={currentStage.transitionRules?.allowSkip ?? false}
                            onChange={(e) => handleTransitionRulesChange(selectedStageIndex, 'allowSkip', e.target.checked)}
                            className="w-4 h-4 text-brand-600 bg-slate-100 border-slate-350 dark:border-slate-700 rounded cursor-pointer"
                          />
                          <label htmlFor={`allow-skip-${currentStage.id}`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            Allow Skip Stage
                          </label>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`allow-revert-${currentStage.id}`}
                            checked={currentStage.transitionRules?.allowRevert ?? false}
                            onChange={(e) => handleTransitionRulesChange(selectedStageIndex, 'allowRevert', e.target.checked)}
                            className="w-4 h-4 text-brand-600 bg-slate-100 border-slate-350 dark:border-slate-700 rounded cursor-pointer"
                          />
                          <label htmlFor={`allow-revert-${currentStage.id}`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            Allow Revert (Send Back)
                          </label>
                        </div>
                      </div>

                      {/* Next stage routes selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                          Routeable Next Stage(s)
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                          {stages
                            .filter(s => s.id !== currentStage.id)
                            .map(s => {
                              const isChecked = currentStage.transitionRules?.nextStages?.includes(s.id) ?? false;
                              
                              return (
                                <button
                                  type="button"
                                  key={s.id}
                                  onClick={() => {
                                    const currentNext = currentStage.transitionRules?.nextStages || [];
                                    const updated = isChecked
                                      ? currentNext.filter(id => id !== s.id)
                                      : [...currentNext, s.id];
                                    handleTransitionRulesChange(selectedStageIndex, 'nextStages', updated);
                                  }}
                                  className={`py-1.5 px-3 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    isChecked
                                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-655'
                                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 hover:bg-slate-50'
                                  }`}
                                >
                                  {s.name || 'Unnamed Stage'}
                                </button>
                              );
                            })}
                          {stages.filter(s => s.id !== currentStage.id).length === 0 && (
                            <span className="text-xs text-slate-400 italic">No other stages in workflow to route to.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Transition Guards setup */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-850 dark:text-white">
                          Transition Guards (Preconditions to enter stage)
                        </h5>
                        <button
                          type="button"
                          onClick={() => handleAddGuard(selectedStageIndex)}
                          className="flex items-center gap-1 py-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold text-[10px] rounded-lg cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add Guard
                        </button>
                      </div>

                      {(!currentStage.guards || currentStage.guards.length === 0) && (
                        <p className="text-xs text-slate-400 italic">No entry guards defined. Ticket can progress into this stage without preconditions.</p>
                      )}

                      {currentStage.guards?.map((guard, gIndex) => (
                        <div
                          key={gIndex}
                          className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/30 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative"
                        >
                          {/* Guard Type */}
                          <div className="w-full sm:w-44 flex-shrink-0 space-y-1">
                            <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Guard Type</label>
                            <select
                              value={guard.type}
                              onChange={(e) => handleGuardChange(selectedStageIndex, gIndex, {
                                type: e.target.value as any,
                                field: '',
                                roles: [],
                                minutes: 0
                              })}
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                            >
                              <option value="customDataPresent">Check Field Filled</option>
                              <option value="resourceAssigned">Resource Bound</option>
                              <option value="roleAuthorized">Role Authorized</option>
                              <option value="minimumDuration">Min Wait Time</option>
                            </select>
                          </div>

                          {/* Parameters based on type */}
                          <div className="flex-1 w-full">
                            {guard.type === 'customDataPresent' && (
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Custom Field Key
                                </label>
                                <input
                                  type="text"
                                  value={guard.field || ''}
                                  onChange={(e) => handleGuardChange(selectedStageIndex, gIndex, { ...guard, field: e.target.value })}
                                  placeholder="e.g. blood_pressure"
                                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs outline-none"
                                />
                              </div>
                            )}

                            {guard.type === 'resourceAssigned' && (
                              <p className="text-xs text-slate-500 pt-3 flex items-center gap-1.5 font-semibold">
                                <UserCheck className="w-4 h-4 text-emerald-500" />
                                Verifies a physical resource (counter/room) is bound to the ticket.
                              </p>
                            )}

                            {guard.type === 'roleAuthorized' && (
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" />
                                  Authorized Roles (comma separated)
                                </label>
                                <input
                                  type="text"
                                  value={guard.roles?.join(', ') || ''}
                                  onChange={(e) => handleGuardChange(selectedStageIndex, gIndex, {
                                    ...guard,
                                    roles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  })}
                                  placeholder="e.g. owner, admin, doctor"
                                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs outline-none"
                                />
                              </div>
                            )}

                            {guard.type === 'minimumDuration' && (
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Minimum Duration (minutes)
                                </label>
                                <input
                                  type="number"
                                  value={guard.minutes || 0}
                                  onChange={(e) => handleGuardChange(selectedStageIndex, gIndex, { ...guard, minutes: Number(e.target.value) })}
                                  min={0}
                                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs outline-none"
                                />
                              </div>
                            )}
                          </div>

                          {/* Delete guard button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveGuard(selectedStageIndex, gIndex)}
                            className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer sm:self-center mt-3 sm:mt-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                <Sliders className="w-12 h-12 text-slate-250 dark:text-slate-800 mb-3" />
                <p className="text-sm font-semibold">No Stage Selected</p>
                <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Select a stage from the sidebar to configure its details.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 py-2 px-6 bg-brand-655 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-655/15 transition-all cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Workflow</span>
          </button>
        </div>
      </form>
    </div>
  );
};

import { 
  collection, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  getDoc,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Workflow, WorkflowStage } from '@/types/firestore';

const WORKFLOWS_COLLECTION = 'workflows';

/**
 * Subscribe to workflows of a tenant in real-time
 */
export function subscribeWorkflows(
  tenantId: string,
  onNext: (workflows: Workflow[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, WORKFLOWS_COLLECTION),
    where('tenantId', '==', tenantId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const workflows: Workflow[] = [];
      snapshot.forEach((docSnap) => {
        workflows.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Workflow);
      });
      onNext(workflows);
    },
    (error) => {
      console.error('[subscribeWorkflows]', error);
      onError(error);
    }
  );
}

/**
 * Get all workflows of a tenant once
 */
export async function getWorkflows(tenantId: string): Promise<Workflow[]> {
  const q = query(
    collection(db, WORKFLOWS_COLLECTION),
    where('tenantId', '==', tenantId)
  );
  
  const snapshot = await getDocs(q);
  const workflows: Workflow[] = [];
  snapshot.forEach((docSnap) => {
    workflows.push({
      id: docSnap.id,
      ...docSnap.data()
    } as Workflow);
  });
  return workflows;
}

/**
 * Get a single workflow and all its stages from subcollection
 */
export async function getWorkflowWithStages(
  workflowId: string
): Promise<{ workflow: Workflow; stages: WorkflowStage[] } | null> {
  const workflowRef = doc(db, WORKFLOWS_COLLECTION, workflowId);
  const workflowSnap = await getDoc(workflowRef);
  
  if (!workflowSnap.exists()) {
    return null;
  }
  
  const workflow = { id: workflowSnap.id, ...workflowSnap.data() } as Workflow;
  
  // Fetch stages subcollection
  const stagesRef = collection(db, WORKFLOWS_COLLECTION, workflowId, 'stages');
  const stagesSnap = await getDocs(stagesRef);
  
  const stages: WorkflowStage[] = [];
  stagesSnap.forEach((docSnap) => {
    stages.push({
      id: docSnap.id,
      ...docSnap.data()
    } as WorkflowStage);
  });
  
  // Sort stages by workflow.stageIds order
  const stageOrder = workflow.stageIds || [];
  stages.sort((a, b) => stageOrder.indexOf(a.id) - stageOrder.indexOf(b.id));
  
  return { workflow, stages };
}

/**
 * Create a new workflow template and all its stages in a transaction
 */
export async function createWorkflow(
  tenantId: string,
  input: {
    name: string;
    description?: string;
    allowCustomTransitions: boolean;
    stages: Omit<WorkflowStage, 'id'>[];
  }
): Promise<string> {
  const workflowRef = doc(collection(db, WORKFLOWS_COLLECTION));
  
  await runTransaction(db, async (transaction) => {
    const stageIds: string[] = [];
    const stageDocs: { ref: any; data: any }[] = [];
    
    // Pre-generate stage documents
    input.stages.forEach((stageInput, index) => {
      const stageId = `stage_${index}_${Date.now()}`;
      stageIds.push(stageId);
      
      const stageRef = doc(db, WORKFLOWS_COLLECTION, workflowRef.id, 'stages', stageId);
      stageDocs.push({
        ref: stageRef,
        data: {
          id: stageId,
          name: stageInput.name,
          allowedResourceTypes: stageInput.allowedResourceTypes || [],
          transitionRules: stageInput.transitionRules || {
            nextStages: [],
            allowSkip: false,
            allowRevert: false
          },
          guards: stageInput.guards || [],
          tenantId // Included for firestore rule verification matching
        }
      });
    });
    
    // Write workflow document
    transaction.set(workflowRef, {
      tenantId,
      name: input.name,
      description: input.description || '',
      stageIds,
      allowCustomTransitions: input.allowCustomTransitions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Write all stages sub-documents
    stageDocs.forEach((docInfo) => {
      transaction.set(docInfo.ref, docInfo.data);
    });
  });
  
  return workflowRef.id;
}

/**
 * Update an existing workflow template and its stages in a transaction
 */
export async function updateWorkflow(
  workflowId: string,
  tenantId: string,
  input: {
    name: string;
    description?: string;
    allowCustomTransitions: boolean;
    stages: WorkflowStage[];
  }
): Promise<void> {
  const workflowRef = doc(db, WORKFLOWS_COLLECTION, workflowId);
  
  await runTransaction(db, async (transaction) => {
    // 1. Fetch current workflow to get existing stageIds
    const workflowSnap = await transaction.get(workflowRef);
    if (!workflowSnap.exists()) {
      throw new Error('Workflow template does not exist');
    }
    const currentData = workflowSnap.data() as Workflow;
    const oldStageIds = currentData.stageIds || [];
    
    // 2. Prepare new stageIds and documents to set/update
    const newStageIds: string[] = [];
    const stageWrites: { ref: any; data: any }[] = [];
    
    input.stages.forEach((stage, index) => {
      // If stage doesn't have an ID, generate one
      const stageId = stage.id || `stage_${index}_${Date.now()}`;
      newStageIds.push(stageId);
      
      const stageRef = doc(db, WORKFLOWS_COLLECTION, workflowId, 'stages', stageId);
      stageWrites.push({
        ref: stageRef,
        data: {
          id: stageId,
          name: stage.name,
          allowedResourceTypes: stage.allowedResourceTypes || [],
          transitionRules: stage.transitionRules || {
            nextStages: [],
            allowSkip: false,
            allowRevert: false
          },
          guards: stage.guards || [],
          tenantId
        }
      });
    });
    
    // 3. Identify and delete stages that are no longer present
    const stagesToDelete = oldStageIds.filter(id => !newStageIds.includes(id));
    stagesToDelete.forEach((id) => {
      const stageRef = doc(db, WORKFLOWS_COLLECTION, workflowId, 'stages', id);
      transaction.delete(stageRef);
    });
    
    // 4. Write all stages
    stageWrites.forEach((docInfo) => {
      transaction.set(docInfo.ref, docInfo.data);
    });
    
    // 5. Update main workflow document
    transaction.update(workflowRef, {
      name: input.name,
      description: input.description || '',
      stageIds: newStageIds,
      allowCustomTransitions: input.allowCustomTransitions,
      updatedAt: serverTimestamp()
    });
  });
}

/**
 * Delete a workflow template and all its stages in a transaction
 */
export async function deleteWorkflow(workflowId: string): Promise<void> {
  const workflowRef = doc(db, WORKFLOWS_COLLECTION, workflowId);
  
  await runTransaction(db, async (transaction) => {
    const workflowSnap = await transaction.get(workflowRef);
    if (!workflowSnap.exists()) return;
    
    const data = workflowSnap.data() as Workflow;
    const stageIds = data.stageIds || [];
    
    // Delete stages subcollection docs
    stageIds.forEach((id) => {
      const stageRef = doc(db, WORKFLOWS_COLLECTION, workflowId, 'stages', id);
      transaction.delete(stageRef);
    });
    
    // Delete workflow doc
    transaction.delete(workflowRef);
  });
}

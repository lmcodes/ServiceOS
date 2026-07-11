# Epic: Generic Workflow Engine

> Version: 1.0 | Last Updated: 2026-07-10 | Status: Completed ✅

---

## 1. Feature: Workflow Templates Builder

### Story: Configure Workflow Stages
*As an administrator, I want to define multi-step workflow templates, so that I can apply them to complex services.*

- **Task ID**: `WF-01`
- **Estimated Complexity**: High (8 story points)
- **Dependencies**: `QC-01`
- **Description**: Implement UI and Firestore models for custom workflow creation, linking stages with sequence indices and allowed resource categories.

#### Subtasks
- [x] Create `workflows` collection layout and mapping schema.
- [x] Build workflow configuration panel in branch settings (integrated in Service Tab layout).
- [x] Add ability to define sequential stages (e.g. Stage 1: screening, Stage 2: consultation).
- [x] Implement transition rules schema mapping (defining allowed next stages).

#### Acceptance Criteria
- Admin can save a workflow template with ordered stages.
- Target services can be linked to a saved workflow template ID.

---

## 2. Feature: Multi-Stage Queue Operations

### Story: Advance Queue through Workflow Stages
*As a clinic nurse, I want to route a patient to the doctor consultation room after recording vitals, so that they can proceed.*

- **Task ID**: `WF-02`
- **Estimated Complexity**: High (13 story points)
- **Dependencies**: `WF-01`, `QC-03`
- **Description**: Update the queue processor to handle stage transitions, evaluate guards, and maintain stage history logs.

#### Subtasks
- [x] Modify `QueueItem` structure to include `currentStageId` and `workflowHistory`.
- [x] Build local transactional stage transitions directly in `queueRepository.ts` for safety and real-time responsiveness.
- [x] Update staff console to filter active lists by current workflow stage.
- [x] Implement stage transition action buttons on active ticket details.

#### Acceptance Criteria
- When a ticket moves to the next stage, its status reverts to WAITING at the new stage.
- Complete audit trail of durations spent in each stage is logged to `workflowHistory`.
- Staff can filter tickets by their current stage or standard queue.

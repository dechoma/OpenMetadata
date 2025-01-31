package org.openmetadata.service.governance.workflows.elements;

import org.openmetadata.schema.governance.workflows.elements.NodeSubType;
import org.openmetadata.schema.governance.workflows.elements.WorkflowNodeDefinitionInterface;
import org.openmetadata.schema.governance.workflows.elements.nodes.automatedTask.CheckEntityAttributesTaskDefinition;
import org.openmetadata.schema.governance.workflows.elements.nodes.automatedTask.JsonLogicTaskDefinition;
import org.openmetadata.schema.governance.workflows.elements.nodes.automatedTask.SetEntityCertificationTaskDefinition;
import org.openmetadata.schema.governance.workflows.elements.nodes.automatedTask.SetGlossaryTermStatusTaskDefinition;
import org.openmetadata.schema.governance.workflows.elements.nodes.endEvent.EndEventDefinition;
import org.openmetadata.schema.governance.workflows.elements.nodes.startEvent.StartEventDefinition;
import org.openmetadata.schema.governance.workflows.elements.nodes.userTask.UserApprovalTaskDefinition;
import org.openmetadata.service.governance.workflows.elements.nodes.automatedTask.CheckEntityAttributesTask;
import org.openmetadata.service.governance.workflows.elements.nodes.automatedTask.JsonLogicFilterTask;
import org.openmetadata.service.governance.workflows.elements.nodes.automatedTask.NoOpTask;
import org.openmetadata.service.governance.workflows.elements.nodes.automatedTask.SetEntityCertificationTask;
import org.openmetadata.service.governance.workflows.elements.nodes.automatedTask.SetGlossaryTermStatusTask;
import org.openmetadata.service.governance.workflows.elements.nodes.endEvent.EndEvent;
import org.openmetadata.service.governance.workflows.elements.nodes.startEvent.StartEvent;
import org.openmetadata.service.governance.workflows.elements.nodes.userTask.UserApprovalTask;

public class NodeFactory {
  public static NodeInterface createNode(WorkflowNodeDefinitionInterface nodeDefinition) {
    return switch (NodeSubType.fromValue(nodeDefinition.getSubType())) {
      case START_EVENT -> new StartEvent((StartEventDefinition) nodeDefinition);
      case END_EVENT -> new EndEvent((EndEventDefinition) nodeDefinition);
      case CHECK_ENTITY_ATTRIBUTES_TASK -> new CheckEntityAttributesTask(
          (CheckEntityAttributesTaskDefinition) nodeDefinition);
      case SET_ENTITY_CERTIFICATION_TASK -> new SetEntityCertificationTask(
          (SetEntityCertificationTaskDefinition) nodeDefinition);
      case SET_GLOSSARY_TERM_STATUS_TASK -> new SetGlossaryTermStatusTask(
          (SetGlossaryTermStatusTaskDefinition) nodeDefinition);
      case USER_APPROVAL_TASK -> new UserApprovalTask((UserApprovalTaskDefinition) nodeDefinition);
      case PYTHON_WORKFLOW_AUTOMATION_TASK -> new NoOpTask(nodeDefinition);
      case JSON_LOGIC_TASK -> new JsonLogicFilterTask((JsonLogicTaskDefinition) nodeDefinition);
    };
  }
}

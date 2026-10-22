import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import {
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import type { NodeChange } from '@xyflow/react';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Box, Button, styled } from '@mui/material';
import { SUNKEN_SURFACE_SX } from 'components/surface.constants';
import { InstanceComponent } from 'types/components.types';
import { Messages } from '../components-view.messages';
import { ComponentNode } from './component-node/component-node';
import { ContainerNode } from './container-node/container-node';
import { CustomEdge, CustomNode } from './diagram-view.types';
import {
  buildGraph,
  diagramHeight,
  toggleGroup,
  toggleNode,
  visibleGraph,
} from './diagram-view.utils';
import { GroupNode } from './group-node/group-node';

const NODE_TYPES = {
  componentNode: ComponentNode,
  containerNode: ContainerNode,
  groupNode: GroupNode,
};

const ReactFlowStyled = styled(ReactFlow<CustomNode, CustomEdge>)(({ theme }) => ({
  '--xy-attribution-background-color': 'transparent',
  '--xy-controls-button-border-color': theme.palette.divider,
  '--xy-controls-button-background-color': theme.palette.background.paper,
  '--xy-controls-button-color': theme.palette.text.primary,
  // Only a group's header is interactive, so the rest of the frame pans the canvas.
  '& .react-flow__node-groupNode': { pointerEvents: 'none' },
}));

interface ComponentsDiagramViewProps {
  components: InstanceComponent[];
}

export const ComponentsDiagramView = ({ components }: ComponentsDiagramViewProps) => {
  const graph = useRef<{ nodes: CustomNode[]; edges: CustomEdge[] }>({
    nodes: [],
    edges: [],
  });
  const selectedId = useRef<string>();
  const collapsedGroupIds = useRef(new Set<string>());
  // Keep fitting the viewport to the graph until the user pans or zooms.
  const autoFit = useRef(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNode>([]);
  const [edges, setEdges] = useEdgesState<CustomEdge>([]);
  const { fitView } = useReactFlow();
  const height = diagramHeight(nodes);

  const showVisible = useCallback(() => {
    const visible = visibleGraph(graph.current.nodes, graph.current.edges);
    setNodes(visible.nodes);
    setEdges(visible.edges);
  }, [setEdges, setNodes]);

  // Rebuilt on every poll, keeping the user's selected pod expanded.
  useEffect(() => {
    graph.current = buildGraph(components, selectedId.current, collapsedGroupIds.current);
    showVisible();
  }, [components, showVisible]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<CustomNode>[]) => {
      onNodesChange(changes);
      if (autoFit.current && changes.some((change) => change.type === 'dimensions')) {
        fitView();
      }
    },
    [fitView, onNodesChange]
  );

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: CustomNode) => {
      if (node.type === 'containerNode') {
        return;
      }
      if (node.type === 'groupNode') {
        const collapsed = toggleGroup(graph.current.nodes, node.id);
        if (collapsed) {
          collapsedGroupIds.current.add(node.id);
        } else {
          collapsedGroupIds.current.delete(node.id);
        }
        showVisible();
        return;
      }
      selectedId.current = node.id;
      toggleNode(graph.current.nodes, graph.current.edges, node.id);
      showVisible();
    },
    [showVisible]
  );

  useEffect(() => {
    if (autoFit.current) {
      fitView();
    }
  }, [fitView, height]);

  const handleResetView = useCallback(() => {
    autoFit.current = true;
    fitView();
  }, [fitView]);

  return (
    <>
      <Box sx={{ ...SUNKEN_SURFACE_SX, height }}>
        <ReactFlowStyled
          data-testid="components-diagram-view"
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={handleNodesChange}
          onNodeClick={handleNodeClick}
          onMoveStart={(event) => {
            // Programmatic viewport changes have no event.
            if (event) {
              autoFit.current = false;
            }
          }}
          minZoom={0.1}
          nodesDraggable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Controls showZoom showFitView={false} showInteractive={false} />
        </ReactFlowStyled>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button startIcon={<RestartAltIcon />} variant="text" onClick={handleResetView}>
          {Messages.resetView}
        </Button>
      </Box>
    </>
  );
};

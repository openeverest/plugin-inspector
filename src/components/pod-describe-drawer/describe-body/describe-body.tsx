import { Stack } from '@openeverest/ui-lib';
import { PodDescription } from 'types/describe.types';
import { DescribeConditions } from '../describe-conditions/describe-conditions';
import { DescribeContainer } from '../describe-container/describe-container';
import { DescribeEvents } from '../describe-events/describe-events';
import { DescribeSection } from '../describe-section/describe-section';
import { FieldList } from '../field-list/field-list';
import { Messages } from '../pod-describe-drawer.messages';
import { timeAgo } from '../pod-describe-drawer.utils';

interface DescribeBodyProps {
  description: PodDescription;
}

export const DescribeBody = ({ description }: DescribeBodyProps) => (
  <Stack sx={{ gap: 3 }}>
    <DescribeSection title={Messages.sections.summary}>
      <FieldList
        fields={[
          { label: Messages.summary.phase, value: description.phase },
          { label: Messages.summary.reason, value: description.reason },
          { label: Messages.summary.message, value: description.message },
          { label: Messages.summary.node, value: description.nodeName },
          { label: Messages.summary.podIP, value: description.podIP },
          { label: Messages.summary.qosClass, value: description.qosClass },
          {
            label: Messages.summary.started,
            value: description.started && timeAgo(description.started),
          },
        ]}
      />
    </DescribeSection>
    <DescribeSection title={Messages.sections.conditions}>
      <DescribeConditions conditions={description.conditions} />
    </DescribeSection>
    {description.initContainers.length > 0 && (
      <DescribeSection title={Messages.sections.initContainers}>
        {description.initContainers.map((c) => (
          <DescribeContainer key={c.name} container={c} />
        ))}
      </DescribeSection>
    )}
    <DescribeSection title={Messages.sections.containers}>
      {description.containers.map((c) => (
        <DescribeContainer key={c.name} container={c} />
      ))}
    </DescribeSection>
    <DescribeSection title={Messages.sections.events}>
      <DescribeEvents events={description.events} />
    </DescribeSection>
  </Stack>
);

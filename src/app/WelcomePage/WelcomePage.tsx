import * as React from 'react';
import { useHistory } from 'react-router-dom';
import {
  PageSection,
  Title,
  Bullseye,
  Flex,
  FlexItem,
  Text,
  TextContent,
  List,
  ListItem,
  Button,
  Checkbox,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import alignment from '@patternfly/react-styles/css/utilities/Alignment/alignment';
import flex from '@patternfly/react-styles/css/utilities/Flex/flex';
import logoMA from '@app/common/logoMA.svg';
import { LocalStorageContext } from '@app/common/context/LocalStorageContext';

const WelcomePage: React.FunctionComponent = () => {
  const { storageValues, setStorageValues } = React.useContext(LocalStorageContext);
  const history = useHistory();
  return (
    <PageSection>
      <Bullseye>
        <Flex className={`${flex.alignItemsCenter} ${flex.flexDirectionColumn}`}>
          <FlexItem>
            <span dangerouslySetInnerHTML={{ __html: logoMA }} />
          </FlexItem>
          <FlexItem>
            <Title
              headingLevel="h1"
              size="4xl"
              className={`${alignment.textAlignCenter} ${spacing.myXl}`}
            >
              Welcome to Migration Toolkit for Virtualization
            </Title>
          </FlexItem>
          <FlexItem>
            <TextContent>
              <Text component="p">
                Migrating workloads to OpenShift Virtualization is a multi-step process.
              </Text>
              <List component="ol">
                <ListItem>Add source and target providers for the migration.</ListItem>
                <ListItem>
                  Map source datastores and networks to target storage classes and networks.
                </ListItem>
                <ListItem>
                  Create a migration plan and select VMs from the source provider for migration.
                </ListItem>
                <ListItem>Run the migration plan.</ListItem>
              </List>
            </TextContent>
          </FlexItem>
          <FlexItem className={`${spacing.myLg}`}>
            <Button
              variant="primary"
              onClick={() => {
                history.push('/dashboard'); // TODO this should go to /providers once that exists
              }}
            >
              Get started
            </Button>
          </FlexItem>
          <FlexItem className={`${spacing.myLg}`}>
            <Checkbox
              label="Don't show this page again."
              id="show-page-checkbox"
              isChecked={!!storageValues.isWelcomePageHidden}
              onChange={(checked: boolean) => {
                setStorageValues({ isWelcomePageHidden: checked ? 'true' : '' });
              }}
            />
          </FlexItem>
        </Flex>
      </Bullseye>
    </PageSection>
  );
};

export default WelcomePage;
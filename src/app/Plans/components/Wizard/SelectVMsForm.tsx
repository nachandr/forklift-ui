import * as React from 'react';
import { Pagination, TextContent, Text, Level, LevelItem } from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import {
  Table,
  TableHeader,
  TableBody,
  TableVariant,
  sortable,
  ICell,
  IRow,
  wrappable,
} from '@patternfly/react-table';

import {
  IVMwareHostTree,
  IVMwareProvider,
  IVMwareVM,
  IVMwareVMTree,
  VMwareTree,
  VMwareTreeType,
} from '@app/queries/types';
import { useSelectionState } from '@konveyor/lib-ui';

import { useSortState, usePaginationState, useFilterState } from '@app/common/hooks';
import { PlanWizardFormState } from './PlanWizard';
import {
  getAvailableVMs,
  getMostSevereVMConcern,
  getVMConcernStatusLabel,
  getVMTreePathInfoByVM,
  vmMatchesConcernFilter,
} from './helpers';
import { useVMwareTreeQuery, useVMwareVMsQuery } from '@app/queries';
import TableEmptyState from '@app/common/components/TableEmptyState';
import { FilterToolbar, FilterType, FilterCategory } from '@app/common/components/FilterToolbar';
import { ResolvedQueries } from '@app/common/components/ResolvedQuery';
import VMConcernsIcon from './VMConcernsIcon';
import VMConcernsDescription from './VMConcernsDescription';

interface ISelectVMsFormProps {
  form: PlanWizardFormState['selectVMs'];
  selectedTreeNodes: VMwareTree[];
  sourceProvider: IVMwareProvider | null;
}

const SelectVMsForm: React.FunctionComponent<ISelectVMsFormProps> = ({
  form,
  selectedTreeNodes,
  sourceProvider,
}: ISelectVMsFormProps) => {
  const hostTreeQuery = useVMwareTreeQuery<IVMwareHostTree>(sourceProvider, VMwareTreeType.Host);
  const vmTreeQuery = useVMwareTreeQuery<IVMwareVMTree>(sourceProvider, VMwareTreeType.VM);
  const vmsQuery = useVMwareVMsQuery(sourceProvider);

  // Even if some of the already-selected VMs don't match the filter, include them in the list.
  const selectedVMsOnMount = React.useRef(form.values.selectedVMs);
  const { availableVMs, treePathInfoByVM } = React.useMemo(() => {
    const filteredVMs = getAvailableVMs(selectedTreeNodes, vmsQuery.data || []);
    const availableVMs = [
      ...selectedVMsOnMount.current,
      ...filteredVMs.filter(
        (vm) => !selectedVMsOnMount.current.some((selectedVM) => vm.id === selectedVM.id)
      ),
    ];
    const treePathInfoByVM = getVMTreePathInfoByVM(
      availableVMs,
      hostTreeQuery.data || null,
      vmTreeQuery.data || null
    );
    return { availableVMs, treePathInfoByVM };
  }, [selectedTreeNodes, vmsQuery.data, hostTreeQuery.data, vmTreeQuery.data]);

  const filterCategories: FilterCategory<IVMwareVM>[] = [
    {
      key: 'name',
      title: 'VM name',
      type: FilterType.search,
      placeholderText: 'Filter by VM ...',
    },
    {
      key: 'migrationAnalysis',
      title: 'Migration analysis',
      type: FilterType.select,
      selectOptions: [
        { key: 'Ok', value: 'Ok' },
        { key: 'Advisory', value: 'Advisory' },
        { key: 'Warning', value: 'Warning' },
        { key: 'Critical', value: 'Critical' },
      ],
      getItemValue: (item) => {
        const worstConcern = getMostSevereVMConcern(item);
        return getVMConcernStatusLabel(worstConcern);
      },
    },
    {
      key: 'analysisCondition',
      title: 'Analysis condition',
      type: FilterType.search,
      placeholderText: 'Filter by analysis condition...',
      getItemValue: (item) => {
        // Mash all the concerns together to match against them as a continuous string
        const concernStrings = item.concerns.map(
          (concern) => `${concern.category} - ${concern.label}: ${concern.assessment}`
        );
        return concernStrings.join(' ; ');
      },
    },
    {
      key: 'dataCenter',
      title: 'Datacenter',
      type: FilterType.search,
      placeholderText: 'Filter by datacenter ...',
      getItemValue: (item) => {
        const { datacenter } = treePathInfoByVM[item.selfLink];
        return datacenter ? datacenter.name : '';
      },
    },
    {
      key: 'cluster',
      title: 'Cluster',
      type: FilterType.search,
      placeholderText: 'Filter by cluster ...',
      getItemValue: (item) => {
        const { cluster } = treePathInfoByVM[item.selfLink];
        return cluster ? cluster.name : '';
      },
    },
    {
      key: 'host',
      title: 'Host',
      type: FilterType.search,
      placeholderText: 'Filter by hostname...',
      getItemValue: (item) => {
        const { host } = treePathInfoByVM[item.selfLink];
        return host ? host.name : '';
      },
    },
    {
      key: 'folderPath',
      title: 'Folder path',
      type: FilterType.search,
      placeholderText: 'Filter by folder path ...',
      getItemValue: (item) => {
        const { folderPathStr } = treePathInfoByVM[item.selfLink];
        return folderPathStr ? folderPathStr : '';
      },
    },
  ];

  const { filterValues, setFilterValues, filteredItems } = useFilterState(
    availableVMs,
    filterCategories
  );

  const getSortValues = (vm: IVMwareVM) => {
    const { datacenter, cluster, host, folderPathStr } = treePathInfoByVM[vm.selfLink];
    return [
      '', // Expand control column
      '', // Checkbox column
      getVMConcernStatusLabel(getMostSevereVMConcern(vm)),
      vm.name,
      datacenter?.name || '',
      cluster?.name || '',
      host?.name || '',
      folderPathStr || '',
      '', // Action column
    ];
  };

  const { sortBy, onSort, sortedItems } = useSortState(filteredItems, getSortValues);
  const { currentPageItems, setPageNumber, paginationProps } = usePaginationState(sortedItems, 10);
  React.useEffect(() => setPageNumber(1), [sortBy, setPageNumber]);

  const { isItemSelected, toggleItemSelected, selectAll } = useSelectionState<IVMwareVM>({
    items: sortedItems,
    isEqual: (a, b) => a.selfLink === b.selfLink,
    externalState: [form.fields.selectedVMs.value, form.fields.selectedVMs.setValue],
  });

  const {
    toggleItemSelected: toggleVMExpanded,
    isItemSelected: isVMExpanded,
  } = useSelectionState<IVMwareVM>({
    items: sortedItems,
    isEqual: (a, b) => a.selfLink === b.selfLink,
  });

  React.useEffect(() => {
    if (filterValues.analysisCondition) {
      const filterText = filterValues.analysisCondition[0];
      const firstMatchingVM = sortedItems.find((vm) => vmMatchesConcernFilter(vm, filterText));
      if (firstMatchingVM && !isVMExpanded(firstMatchingVM)) {
        toggleVMExpanded(firstMatchingVM);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValues.analysisCondition]);

  const columns: ICell[] = [
    {
      title: 'Migration analysis',
      transforms: [sortable, wrappable],
    },
    { title: 'VM name', transforms: [sortable, wrappable] },
    { title: 'Datacenter', transforms: [sortable] },
    { title: 'Cluster', transforms: [sortable] },
    { title: 'Host', transforms: [sortable] },
    { title: 'Folder path', transforms: [sortable, wrappable] },
  ];

  const rows: IRow[] = [];

  currentPageItems.forEach((vm: IVMwareVM) => {
    const isExpanded = isVMExpanded(vm);
    const { datacenter, cluster, host, folderPathStr } = treePathInfoByVM[vm.selfLink];
    rows.push({
      meta: { vm },
      selected: isItemSelected(vm),
      isOpen: isExpanded,
      cells: [
        {
          title: <VMConcernsIcon vm={vm} />,
        },
        vm.name,
        datacenter?.name || '',
        cluster?.name || '',
        host?.name || '',
        folderPathStr || '',
      ],
    });
    if (isExpanded) {
      rows.push({
        parent: rows.length - 1,
        fullWidth: true,
        cells: [
          {
            title: (
              <VMConcernsDescription
                vm={vm}
                filterText={
                  (filterValues.analysisCondition && filterValues.analysisCondition[0]) || ''
                }
              />
            ),
            props: { colSpan: columns.length + 2 },
          },
        ],
      });
    }
  });

  return (
    <ResolvedQueries
      results={[hostTreeQuery, vmTreeQuery, vmsQuery]}
      errorTitles={[
        'Error loading VMware host tree data',
        'Error loading VMware VM tree data',
        'Error loading VMs',
      ]}
    >
      {availableVMs.length === 0 ? (
        <TableEmptyState
          titleText="No VMs found"
          bodyText="No results match your filter. Go back and make a different selection."
        />
      ) : (
        <>
          <TextContent className={spacing.mbMd}>
            <Text component="p">
              Select VMs for migration. The Migration assessment column highlights conditions
              related to migrating a particular VM, as determined by Red Hat&apos;s migration
              analytics service.
            </Text>
          </TextContent>
          <Level>
            <LevelItem>
              <FilterToolbar<IVMwareVM>
                filterCategories={filterCategories}
                filterValues={filterValues}
                setFilterValues={setFilterValues}
              />
            </LevelItem>
            <LevelItem>
              <Pagination {...paginationProps} widgetId="vms-table-pagination-top" />
            </LevelItem>
          </Level>
          {filteredItems.length > 0 ? (
            <Table
              aria-label="VMware VMs table"
              variant={TableVariant.compact}
              cells={columns}
              rows={rows}
              sortBy={sortBy}
              onSort={onSort}
              onSelect={(_event, isSelected, rowIndex, rowData) => {
                if (rowIndex === -1) {
                  selectAll(isSelected);
                } else {
                  toggleItemSelected(rowData.meta.vm, isSelected);
                }
              }}
              onCollapse={(_event, _rowKey, _isOpen, rowData) => {
                toggleVMExpanded(rowData.meta.vm);
              }}
            >
              <TableHeader />
              <TableBody />
            </Table>
          ) : (
            <TableEmptyState titleText="No VMs found" bodyText="No results match your filter." />
          )}

          <Level>
            <LevelItem>
              <TextContent>
                <Text
                  component="small"
                  className={spacing.mlLg}
                >{`${form.values.selectedVMs.length} selected`}</Text>
              </TextContent>
            </LevelItem>
            <LevelItem>
              <Pagination
                {...paginationProps}
                widgetId="vms-table-pagination-bottom"
                variant="bottom"
              />
            </LevelItem>
          </Level>
        </>
      )}
    </ResolvedQueries>
  );
};

export default SelectVMsForm;

import { FiltersExpression, Sorting, Grouping, Operation, Sort } from './filtersTypes';
import { AuctionCustomEnum, AuctionCustomFilter } from './AuctionCustomFilters';

export class QueryRequest {
  limit: number = 20;
  offset: number = 0;
  filters: FiltersExpression;
  sorting: Sorting[];
  groupByOption: Grouping;
  customFilters: AuctionCustomFilter[];

  constructor(init?: Partial<QueryRequest>) {
    Object.assign(this, init);
  }

  getFilter(name: string): string | undefined {
    const values = this.filters.filters.find(x => x.field === name)?.values;
    if (!values || values.length === 0) {
      return undefined;
    }

    return values[0];
  }

  getRange(field: AuctionCustomEnum): { startPrice: string, endPrice: string } | undefined {
    const customFilters = this.customFilters;
    if (!customFilters) {
      return undefined;
    }

    const customFilter = customFilters.find(x => x.field === field && x.op === Operation.BETWEEN);
    if (!customFilter) {
      return undefined;
    }

    const values = customFilters[0].values;
    if (!values || values.length !== 2) {
      return undefined;
    }

    return {
      startPrice: values[0],
      endPrice: values[1],
    };
  }

  getSort(): { field: string, direction: Sort } | undefined {
    if (!this.sorting || this.sorting.length === 0) {
      return undefined;
    }

    return this.sorting[0];
  }
}

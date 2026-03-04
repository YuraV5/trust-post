export interface UserRolePeriodOutput {
  id: number;
  role: string;
  startDate: Date;
  endDate: Date | null;
  changedById: string;
  createdAt: Date;
}

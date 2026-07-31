import { DashboardRepository } from "@/repositories/dashboard.repository";

export class DashboardService {
  constructor(
    private readonly repository = new DashboardRepository()
  ) {}

  async getSummary(organizationId: string, memberId: string) {
    return this.repository.getSummary(organizationId, memberId);
  }

  async getActivity(organizationId: string) {
    return this.repository.getActivity(organizationId);
  }
}

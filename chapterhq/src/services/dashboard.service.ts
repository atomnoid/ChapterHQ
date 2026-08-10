import { DashboardRepository } from "@/repositories/dashboard.repository";

export class DashboardService {
  constructor(
    private readonly repository = new DashboardRepository()
  ) {}

  async getSummary(organizationId: string, memberId: string, activeCommitteeId: string | null = null) {
    return this.repository.getSummary(organizationId, memberId, activeCommitteeId);
  }

  async getActivity(organizationId: string) {
    return this.repository.getActivity(organizationId);
  }
}

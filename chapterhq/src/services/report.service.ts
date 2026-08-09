import {
  AttendanceReport,
  EventsReport,
  FinanceReport,
  MembersReport,
  ReportRepository,
} from "@/repositories/report.repository";

export class ReportService {
  constructor(private readonly repository = new ReportRepository()) {}

  async getMembersReport(organizationId: string): Promise<MembersReport> {
    return this.repository.getMembersReport(organizationId);
  }

  async getEventsReport(organizationId: string, committeeId?: string | null): Promise<EventsReport> {
    return this.repository.getEventsReport(organizationId, committeeId);
  }

  async getFinanceReport(organizationId: string, committeeId?: string | null): Promise<FinanceReport> {
    return this.repository.getFinanceReport(organizationId, committeeId);
  }

  async getAttendanceReport(organizationId: string, committeeId?: string | null): Promise<AttendanceReport> {
    return this.repository.getAttendanceReport(organizationId, committeeId);
  }
}

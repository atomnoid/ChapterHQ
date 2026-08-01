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

  async getEventsReport(organizationId: string): Promise<EventsReport> {
    return this.repository.getEventsReport(organizationId);
  }

  async getFinanceReport(organizationId: string): Promise<FinanceReport> {
    return this.repository.getFinanceReport(organizationId);
  }

  async getAttendanceReport(organizationId: string): Promise<AttendanceReport> {
    return this.repository.getAttendanceReport(organizationId);
  }
}

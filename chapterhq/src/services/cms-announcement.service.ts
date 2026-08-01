import { CMSAnnouncementRepository, ListAnnouncementsQuery } from "@/repositories/cms-announcement.repository";
import { CreateAnnouncementInput, UpdateAnnouncementInput } from "@/validators/cms.validator";
import { logActivity } from "@/lib/audit-logger";

export class AnnouncementNotFoundError extends Error {
  constructor(message = "Announcement not found.") {
    super(message);
    this.name = "AnnouncementNotFoundError";
  }
}

export class CMSAnnouncementService {
  private announcementRepo: CMSAnnouncementRepository;

  constructor() {
    this.announcementRepo = new CMSAnnouncementRepository();
  }

  async createAnnouncement(
    organizationId: string,
    input: CreateAnnouncementInput,
    actorId?: string
  ) {
    const announcement = await this.announcementRepo.create({
      organizationId,
      ...input,
      authorId: actorId,
    });

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "create",
        resource: "cms_announcement",
        targetId: announcement.id,
        targetName: announcement.title,
      });
    }

    return announcement;
  }

  async updateAnnouncement(
    id: string,
    organizationId: string,
    input: UpdateAnnouncementInput,
    actorId?: string
  ) {
    const existing = await this.getAnnouncement(id, organizationId);

    const updated = await this.announcementRepo.update(id, organizationId, input);

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "update",
        resource: "cms_announcement",
        targetId: existing.id,
        targetName: updated.title,
      });
    }

    return updated;
  }

  async getAnnouncement(id: string, organizationId: string) {
    const announcement = await this.announcementRepo.findById(id, organizationId);
    if (!announcement) {
      throw new AnnouncementNotFoundError();
    }
    return announcement;
  }

  async listAnnouncements(organizationId: string, query: ListAnnouncementsQuery = {}) {
    return this.announcementRepo.list(organizationId, query);
  }

  async deleteAnnouncement(id: string, organizationId: string, actorId?: string) {
    const announcement = await this.getAnnouncement(id, organizationId);

    const deleted = await this.announcementRepo.softDelete(id, organizationId);

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "delete",
        resource: "cms_announcement",
        targetId: announcement.id,
        targetName: announcement.title,
      });
    }

    return deleted;
  }
}

import { CMSPageRepository, ListPagesQuery } from "@/repositories/cms-page.repository";
import { CreatePageInput, UpdatePageInput } from "@/validators/cms.validator";
import { logActivity } from "@/lib/audit-logger";

export class PageNotFoundError extends Error {
  constructor(message = "Page not found.") {
    super(message);
    this.name = "PageNotFoundError";
  }
}

export class DuplicatePageSlugError extends Error {
  constructor(message = "A page with this slug already exists.") {
    super(message);
    this.name = "DuplicatePageSlugError";
  }
}

export class CMSPageService {
  private pageRepo: CMSPageRepository;

  constructor() {
    this.pageRepo = new CMSPageRepository();
  }

  async createPage(
    organizationId: string,
    input: CreatePageInput,
    actorId?: string
  ) {
    const existing = await this.pageRepo.findBySlug(input.slug, organizationId);
    if (existing) {
      throw new DuplicatePageSlugError();
    }

    const page = await this.pageRepo.create({
      organizationId,
      ...input,
      authorId: actorId,
    });

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "create",
        resource: "cms_page",
        targetId: page.id,
        targetName: page.title,
      });
    }

    return page;
  }

  async updatePage(
    id: string,
    organizationId: string,
    input: UpdatePageInput,
    actorId?: string
  ) {
    const existing = await this.getPage(id, organizationId);

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await this.pageRepo.findBySlug(input.slug, organizationId);
      if (slugConflict && slugConflict.id !== id) {
        throw new DuplicatePageSlugError();
      }
    }

    const updated = await this.pageRepo.update(id, organizationId, input);

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "update",
        resource: "cms_page",
        targetId: existing.id,
        targetName: updated.title,
      });
    }

    return updated;
  }

  async getPage(id: string, organizationId: string) {
    const page = await this.pageRepo.findById(id, organizationId);
    if (!page) {
      throw new PageNotFoundError();
    }
    return page;
  }

  async listPages(organizationId: string, query: ListPagesQuery = {}) {
    return this.pageRepo.list(organizationId, query);
  }

  async deletePage(id: string, organizationId: string, actorId?: string) {
    const page = await this.getPage(id, organizationId);

    const deleted = await this.pageRepo.softDelete(id, organizationId);

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "delete",
        resource: "cms_page",
        targetId: page.id,
        targetName: page.title,
      });
    }

    return deleted;
  }
}

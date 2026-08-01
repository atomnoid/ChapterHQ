import { CommitteeRepository } from "@/repositories/committee.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";

export class CommitteeNotFoundError extends Error {
  constructor() {
    super("Committee not found.");
    this.name = "CommitteeNotFoundError";
  }
}

export class DuplicateCommitteeNameError extends Error {
  constructor() {
    super("A committee with this name already exists in this organization.");
    this.name = "DuplicateCommitteeNameError";
  }
}

export class CommitteeService {
  constructor(
    private readonly repository = new CommitteeRepository()
  ) {}

  async createCommittee(
    organizationId: string,
    data: { name: string; description?: string },
    actorUserId?: string
  ) {
    const nameExists = await this.repository.existsByName(organizationId, data.name);
    if (nameExists) {
      throw new DuplicateCommitteeNameError();
    }

    const committee = await this.repository.create({
      organizationId,
      name: data.name,
      description: data.description,
    });

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "create",
        "committee",
        committee.id,
        committee.name
      );
    }

    return committee;
  }

  async getCommittees(params: PaginationQuery & { organizationId: string }) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.repository.list({
      ...paginationParams,
      organizationId: params.organizationId,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getCommittee(id: string, organizationId: string) {
    const committee = await this.repository.findById(id, organizationId);
    if (!committee) {
      throw new CommitteeNotFoundError();
    }
    return committee;
  }

  async updateCommittee(
    id: string,
    organizationId: string,
    data: { name?: string; description?: string },
    actorUserId?: string
  ) {
    const committee = await this.repository.findById(id, organizationId);
    if (!committee) {
      throw new CommitteeNotFoundError();
    }

    if (data.name) {
      const nameExists = await this.repository.existsByName(organizationId, data.name, id);
      if (nameExists) {
        throw new DuplicateCommitteeNameError();
      }
    }

    const updated = await this.repository.update(id, organizationId, data);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "update",
        "committee",
        id,
        updated.name,
        data
      );
    }

    return updated;
  }

  async deleteCommittee(id: string, organizationId: string, actorUserId?: string) {
    const committee = await this.repository.findById(id, organizationId);
    if (!committee) {
      throw new CommitteeNotFoundError();
    }

    const deleted = await this.repository.softDelete(id, organizationId);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "delete",
        "committee",
        id,
        committee.name
      );
    }

    return deleted;
  }
}

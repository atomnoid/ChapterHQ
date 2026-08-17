import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface CreateSubmissionData {
  formId: string;
  organizationId: string;
  memberId: string;
  userId: string;
  answers: Array<{ fieldId: string; value: string | null }>;
}

interface SubmissionFilters {
  organizationId: string;
  formId: string;
  memberIds?: string[];
  skip?: number;
  take?: number;
}

export class CustomFormSubmissionRepository {
  async create(data: CreateSubmissionData) {
    return prisma.customFormSubmission.create({
      data: {
        formId: data.formId,
        organizationId: data.organizationId,
        memberId: data.memberId,
        userId: data.userId,
        answers: {
          create: data.answers.map((answer) => ({
            fieldId: answer.fieldId,
            value: answer.value,
          })),
        },
      },
      include: {
        answers: {
          include: {
            field: true,
          },
        },
        form: {
          include: {
            fields: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
  }

  async findByIdAndOrganization(id: string, organizationId: string, formId: string) {
    const submission = await prisma.customFormSubmission.findFirst({
      where: {
        id,
        organizationId,
        formId,
      },
      include: {
        answers: {
          include: {
            field: true,
          },
        },
        form: {
          include: {
            fields: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    return submission;
  }

  async findByFormAndMember(formId: string, memberId: string, organizationId: string) {
    return prisma.customFormSubmission.findFirst({
      where: {
        formId,
        memberId,
        organizationId,
      },
      include: {
        answers: {
          include: {
            field: true,
          },
        },
        form: {
          include: {
            fields: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
  }

  async listByForm(filters: SubmissionFilters) {
    const whereClause: Prisma.CustomFormSubmissionWhereInput = {
      organizationId: filters.organizationId,
      formId: filters.formId,
    };

    if (filters.memberIds && filters.memberIds.length > 0) {
      whereClause.memberId = { in: filters.memberIds };
    }

    const [submissions, total] = await Promise.all([
      prisma.customFormSubmission.findMany({
        where: whereClause,
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          answers: {
            include: {
              field: true,
            },
          },
          form: {
            include: {
              fields: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.customFormSubmission.count({ where: whereClause }),
    ]);

    return { submissions, total };
  }

  async listByMemberAndOrganization(memberId: string, organizationId: string) {
    return prisma.customFormSubmission.findMany({
      where: {
        memberId,
        organizationId,
      },
      include: {
        form: {
          include: {
            fields: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  async getSubmissionCount(formId: string): Promise<number> {
    return prisma.customFormSubmission.count({
      where: { formId },
    });
  }
}

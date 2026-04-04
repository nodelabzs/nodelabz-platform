import { z } from "zod";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";

export const aiMemoryRouter = router({
  /**
   * List recent AI memory entries by category (e.g. "ai_image_gen", "ai_video_gen").
   */
  list: tenantProcedure
    .input(
      z.object({
        category: z.string(),
        limit: z.number().min(1).max(50).optional().default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await prisma.aiMemory.findMany({
        where: {
          tenantId: ctx.effectiveTenantId,
          category: input.category,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          key: true,
          value: true,
          createdAt: true,
        },
      });

      return items;
    }),
});

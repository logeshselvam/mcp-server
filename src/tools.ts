import { MenuMCP } from "./index.ts";

export async function initializeTools(agent: MenuMCP) {
  agent.server.tool("get_menu", () => {
    return {
      content: [
        {
          type: "text",
          text: "Hello, world!",
        },
      ],
    };
  });
  // agent.server.tool(
  //   "filter_menu_items",
  //   "Filter menu items by tags, excluded ingredients, or price range",
  //   filterMenuItemsInputSchema,
  //   async ({ menuId, tags, excludeIngredients, priceRange }) => {
  //     try {
  //       return createReply({});
  //     } catch (error) {
  //       return createErrorReply(error);
  //     }
  //   }
  // );

  // agent.server.tool(
  //   "suggest_meal_plan",
  //   "Suggest a multi-course meal based on constraints like group size, budget, and dietary needs",
  //   suggestMealPlanInputSchema,
  //   async ({ menuId, groupSize = 1, budget, dietaryRestrictions }) => {
  //     return createReply({});
  //   }
  // );
}

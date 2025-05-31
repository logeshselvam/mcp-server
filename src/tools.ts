import { invariant } from "@epic-web/invariant";
import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MenuMCP } from "./index.ts";
import { getErrorMessage } from "./utils";

// Fetch menus from the real API
async function fetchMenusFromAPI(): Promise<any[]> {
  const res = await fetch('https://render-deploy-iib7.onrender.com/menus');
  if (!res.ok) throw new Error('Failed to fetch menus from API');
  return res.json();
}

export async function initializeTools(agent: MenuMCP) {
  // NEW: Find menu by name tool
  agent.server.tool(
    "find_menu_by_name",
    "Find a menu by its name (supports partial matching)",
    {
      name: z.string().describe("The name of the menu to search for"),
      exactMatch: z
        .boolean()
        .default(false)
        .describe(
          "Whether to require exact name match or allow partial matches"
        ),
    },
    async ({ name, exactMatch }) => {
      try {
        const menu = await findMenuByName(name, exactMatch);
        invariant(menu, `Menu with name \"${name}\" not found`);

        return {
          content: [
            createTextContent(`Found menu: \"${menu.name}\" (ID: ${menu.id})`),
            createMenuResourceContent(menu),
          ],
        };
      } catch (error) {
        return createErrorReply(error);
      }
    }
  );

  // NEW: Get dietary options/tags for a menu by name
  agent.server.tool(
    "get_menu_dietary_options",
    "Get all dietary options (tags) available for a specific menu by name",
    {
      menuName: z.string().describe("The name of the menu"),
      exactMatch: z
        .boolean()
        .default(false)
        .describe(
          "Whether to require exact name match or allow partial matches"
        ),
    },
    async ({ menuName, exactMatch }) => {
      try {
        const menu = await findMenuByName(menuName, exactMatch);
        invariant(menu, `Menu with name \"${menuName}\" not found`);

        const tags = await getAllTags(menu.id);
        const dietaryOptions = categorizeTags(tags);

        return {
          content: [
            createTextContent(
              `Dietary options available at \"${menu.name}\": ${tags.join(", ")}`
            ),
            createTextContent(
              JSON.stringify(
                {
                  menuName: menu.name,
                  menuId: menu.id,
                  cuisine: menu.cuisine,
                  allTags: tags,
                  dietaryCategories: dietaryOptions,
                  totalOptions: tags.length,
                },
                null,
                2
              )
            ),
          ],
        };
      } catch (error) {
        return createErrorReply(error);
      }
    }
  );

  // ENHANCED: List all menus tool
  agent.server.tool(
    "list_menus",
    "Get a list of all available menus",
    {},
    async () => {
      try {
        const menus = (await fetchMenusFromAPI()).map((menu) => ({
          id: menu.id,
          name: menu.name,
          cuisine: menu.cuisine,
          rating: menu.rating,
          numRatings: menu.numRatings,
          availableTimes: menu.availableTimes,
        }));

        return {
          content: [
            createTextContent(`Found ${menus.length} menus available`),
            createTextContent(JSON.stringify({ menus }, null, 2)),
          ],
        };
      } catch (error) {
        return createErrorReply(error);
      }
    }
  );

  agent.server.tool(
    "get_menu",
    "Get a menu by ID",
    {
      id: z.number().describe("The ID of the menu"),
    },
    async ({ id }) => {
      try {
        const menus = await fetchMenusFromAPI();
        const foundMenu = menus.find((m) => m.id === id);
        invariant(foundMenu, `Menu with ID \"${id}\" not found`);
        return {
          content: [createMenuResourceContent(foundMenu)],
        };
      } catch (error) {
        return createErrorReply(error);
      }
    }
  );

  // ENHANCED: Updated list_tags to support menu name lookup
  agent.server.tool(
    "list_tags",
    "Get all unique tags available across menu items",
    {
      menuId: z
        .number()
        .optional()
        .describe("Filter tags by specific menu ID (optional)"),
      menuName: z
        .string()
        .optional()
        .describe(
          "Filter tags by menu name (optional, takes precedence over menuId)"
        ),
    },
    async ({ menuId, menuName }) => {
      try {
        let targetMenuId = menuId;

        // If menuName is provided, find the menu and use its ID
        if (menuName) {
          const menu = await findMenuByName(menuName, false);
          invariant(menu, `Menu with name \"${menuName}\" not found`);
          targetMenuId = menu.id;
        }

        const tags = await getAllTags(targetMenuId);

        return {
          content: [
            createTextContent(
              `Available tags${targetMenuId ? ` for menu ${menuName || targetMenuId}` : ""}: ${tags.join(", ")}`
            ),
            createTextContent(
              JSON.stringify(
                {
                  tags,
                  count: tags.length,
                  menuId: targetMenuId || "all",
                  menuName: menuName || null,
                },
                null,
                2
              )
            ),
          ],
        };
      } catch (error) {
        return createErrorReply(error);
      }
    }
  );

  agent.server.tool(
    "get_item_details",
    "Get detailed information about a specific menu item by name or ID",
    {
      identifier: z
        .union([z.string(), z.number()])
        .describe("Item name or ID to search for"),
      exactMatch: z
        .boolean()
        .default(false)
        .describe(
          "Whether to require exact name match or allow partial matches"
        ),
    },
    async ({ identifier, exactMatch }) => {
      try {
        const item = await getItemDetails(identifier, exactMatch);
        invariant(item, `Menu item \"${identifier}\" not found`);

        return {
          content: [
            createTextContent(`Details for \"${item.name}\" - $${item.price}`),
            createTextContent(item.description ? `Description: ${item.description}` : "No description available."),
            createMenuItemResourceContent(item),
          ],
        };
      } catch (error) {
        return createErrorReply(error);
      }
    }
  );

  agent.server.tool(
    "filter_menu_items",
    "Filter menu items by tags, price range, and other criteria",
    {
      includeTags: z
        .array(z.string())
        .optional()
        .describe(
          'Tags that items must have (e.g., ["vegetarian", "gluten-free"])'
        ),
      excludeTags: z
        .array(z.string())
        .optional()
        .describe('Tags that items must not have (e.g., ["seafood"])'),
      minPrice: z.number().optional().describe("Minimum price filter"),
      maxPrice: z.number().optional().describe("Maximum price filter"),
      menuId: z.number().optional().describe("Filter by specific menu ID"),
      menuName: z.string().optional().describe("Filter by menu name"),
      ageGroup: z
        .string()
        .optional()
        .describe('Filter by age group (e.g., "Adults", "All")'),
    },
    async ({
      includeTags,
      excludeTags,
      minPrice,
      maxPrice,
      menuId,
      menuName,
      ageGroup,
    }) => {
      try {
        let targetMenuId = menuId;

        // If menuName is provided, find the menu and use its ID
        if (menuName) {
          const menu = await findMenuByName(menuName, false);
          invariant(menu, `Menu with name \"${menuName}\" not found`);
          targetMenuId = menu.id;
        }

        const filteredItems = await filterMenuItems({
          includeTags,
          excludeTags,
          minPrice,
          maxPrice,
          menuId: targetMenuId,
          ageGroup,
        });

        return {
          content: [
            createTextContent(
              `Found ${filteredItems.length} menu items matching your criteria`
            ),
            createTextContent(
              JSON.stringify(
                {
                  count: filteredItems.length,
                  filters: {
                    includeTags,
                    excludeTags,
                    minPrice,
                    maxPrice,
                    menuId: targetMenuId,
                    menuName,
                    ageGroup,
                  },
                  items: filteredItems.map((item) => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    description: item.description,
                    tags: item.tags,
                    rating: item.rating,
                  })),
                },
                null,
                2
              )
            ),
            ...filteredItems.map((item) => [
              createTextContent(item.description ? `Description: ${item.description}` : "No description available."),
              createMenuItemResourceContent(item)
            ]).flat(),
          ],
        };
      } catch (error) {
        return createErrorReply(error);
      }
    }
  );
}

// NEW: Find menu by name function
async function findMenuByName(name: string, exactMatch: boolean = false): Promise<any | null> {
  const menus = await fetchMenusFromAPI();
  return (
    menus.find((menu) => {
      if (exactMatch) {
        return menu.name.toLowerCase() === name.toLowerCase();
      } else {
        return menu.name.toLowerCase().includes(name.toLowerCase());
      }
    }) || null
  );
}

// NEW: Categorize tags into dietary categories
function categorizeTags(tags: string[]): Record<string, string[]> {
  const categories = {
    dietary: [] as string[],
    allergens: [] as string[],
    course: [] as string[],
    special: [] as string[],
  };

  tags.forEach((tag) => {
    const lowerTag = tag.toLowerCase();
    if (["vegetarian", "vegan", "gluten-free"].includes(lowerTag)) {
      categories.dietary.push(tag);
    } else if (["seafood"].includes(lowerTag)) {
      categories.allergens.push(tag);
    } else if (["starter", "dessert"].includes(lowerTag)) {
      categories.course.push(tag);
    } else {
      categories.special.push(tag);
    }
  });

  return categories;
}

async function getAllTags(menuId?: number): Promise<string[]> {
  const menus = await fetchMenusFromAPI();
  const menusToSearch = menuId
    ? menus.filter((menu) => menu.id === menuId)
    : menus;

  const allTags = new Set<string>();

  menusToSearch.forEach((menu) => {
    menu.categories.forEach((category: any) => {
      category.items.forEach((item: any) => {
        item.tags.forEach((tag: string) => allTags.add(tag));
      });
    });
  });

  return Array.from(allTags).sort();
}

async function getItemDetails(
  identifier: string | number,
  exactMatch: boolean = false
): Promise<any | null> {
  const menus = await fetchMenusFromAPI();
  for (const menu of menus) {
    for (const category of menu.categories) {
      for (const item of category.items) {
        // Search by ID
        if (typeof identifier === "number" && item.id === identifier) {
          return item;
        }

        // Search by name
        if (typeof identifier === "string") {
          if (exactMatch) {
            if (item.name.toLowerCase() === identifier.toLowerCase()) {
              return item;
            }
          } else {
            if (item.name.toLowerCase().includes(identifier.toLowerCase())) {
              return item;
            }
          }
        }
      }
    }
  }

  return null;
}

async function filterMenuItems(options: {
  includeTags?: string[];
  excludeTags?: string[];
  minPrice?: number;
  maxPrice?: number;
  menuId?: number;
  ageGroup?: string;
}): Promise<any[]> {
  const menus = await fetchMenusFromAPI();
  const menusToSearch = options.menuId
    ? menus.filter((menu) => menu.id === options.menuId)
    : menus;

  const allItems: any[] = [];

  // Collect all items from the menus
  menusToSearch.forEach((menu) => {
    menu.categories.forEach((category: any) => {
      category.items.forEach((item: any) => {
        allItems.push(item);
      });
    });
  });

  // Apply filters
  return allItems.filter((item) => {
    // Price filters
    if (options.minPrice !== undefined && item.price < options.minPrice)
      return false;
    if (options.maxPrice !== undefined && item.price > options.maxPrice)
      return false;

    // Age group filter
    if (options.ageGroup && item.ageGroup !== options.ageGroup) return false;

    // Include tags - item must have ALL specified tags
    if (options.includeTags?.length) {
      const hasAllIncludeTags = options.includeTags.every((tag) =>
        item.tags.includes(tag)
      );
      if (!hasAllIncludeTags) return false;
    }

    // Exclude tags - item must have NONE of the excluded tags
    if (options.excludeTags?.length) {
      const hasExcludedTag = options.excludeTags.some((tag) =>
        item.tags.includes(tag)
      );
      if (hasExcludedTag) return false;
    }

    return true;
  });
}

function createTextContent(text: unknown): CallToolResult["content"][number] {
  if (typeof text === "string") {
    return { type: "text", text };
  } else {
    return { type: "text", text: JSON.stringify(text) };
  }
}

function createErrorReply(error: unknown): CallToolResult {
  console.error(`Failed running tool:\n`, error);
  return {
    isError: true,
    content: [{ type: "text", text: getErrorMessage(error) }],
  };
}

type ResourceContent = CallToolResult["content"][number];

interface MenuData {
  id: number;
  restaurantId: number;
  name: string;
  cuisine: string;
  createdAt: string;
  ageGroup: string;
  imageUrl: string;
  rating: number;
  numRatings: number;
  availableTimes: string[];
  categories: any[];
}

function createMenuResourceContent(menuData: MenuData): ResourceContent {
  return {
    type: "resource",
    resource: {
      uri: `menu://${menuData.id}`,
      mimeType: "application/json",
      text: JSON.stringify(menuData, null, 2),
    },
  };
}

function createMenuItemResourceContent(item: { id: number }): ResourceContent {
  return {
    type: "resource",
    resource: {
      uri: `menu-item://${item.id}`,
      mimeType: "application/json",
      text: JSON.stringify(item),
    },
  };
}

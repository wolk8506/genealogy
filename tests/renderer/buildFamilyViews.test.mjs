import { describe, it, expect } from "vitest";
import { buildFamilyViews } from "../../src/utils/families/buildFamilyViews.js";
import {
  findFamily,
  resolveFamilyForPerson,
} from "../../src/utils/families/resolveFamily.js";

describe("buildFamilyViews", () => {
  const people = [
    {
      id: 10,
      gender: "male",
      firstName: "Иван",
      lastName: "Семейнов",
      spouse: [20],
    },
    {
      id: 20,
      gender: "female",
      firstName: "Мария",
      lastName: "Семейнова",
      spouse: [10],
    },
    {
      id: 30,
      gender: "male",
      firstName: "Пётр",
      lastName: "Семейнов",
      father: 10,
      mother: 20,
      birthday: "2005-05-05",
    },
  ];

  it("builds union from spouses and assigns shared child", () => {
    const { families, byPerson } = buildFamilyViews(people);
    expect(families).toHaveLength(1);

    const family = families[0];
    expect(family.partnerIds.sort()).toEqual(["10", "20"]);
    expect(family.isSingle).toBe(false);
    expect(family.children.map((c) => c.id)).toEqual([30]);

    expect(byPerson.get("10")).toHaveLength(1);

    const resolved = resolveFamilyForPerson(families, byPerson, 10);
    expect(resolved?.key).toBe(family.key);
    expect(findFamily(families, family.key)).toBe(family);
  });
});

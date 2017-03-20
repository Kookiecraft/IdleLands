
export const Regions = {
  'Frigri Town': {
    shopPriceMultiplier: () => 2.5,
    shopSlots: () => 3,
    shopQuality: () => 2.5,
    TownCrierChance: (player, baseValue) => baseValue*3
  },
  'Homlet Town': {
    shopPriceMultiplier: () => 1.3,
    shopSlots: () => 1,
    shopQuality: () => 2.3,
    TownCrierChance: (player, baseValue) => baseValue*3
  },
  'Norkos Town': {
    luck: () => 15,
    shopPriceMultiplier: () => 1,
    shopSlots: () => 5,
    shopQuality: () => 1,
    TownCrierChance: (player, baseValue) => baseValue*3
  },
  'Maeles Town': {
    shopPriceMultiplier: () => 2,
    shopSlots: () => 2,
    shopQuality: () => 1.5,
    TownCrierChance: (player, baseValue) => baseValue*3
  },
  'Raburro Town': {
    shopPriceMultiplier: () => 5,
    shopSlots: () => 10,
    shopQuality: () => 0.9,
    TownCrierChance: (player, baseValue) => baseValue*3
  },
  'Vocalnus Town': {
    shopPriceMultiplier: () => 1,
    shopSlots: () => 3,
    shopQuality: () => 1.4,
    TownCrierChance: (player, baseValue) => baseValue*3
  },
  'Astral Town': {
    shopPriceMultiplier: () => 10,
    shopSlots: () => 5,
    shopQuality: () => 7,
    TownCrierChance: (player, baseValue) => baseValue*3
  },

  'Dangerous Cave Area': {
    BattleChance:       (player, baseValue) => baseValue*1.2,
    BattlePvPChance:    (player, baseValue) => baseValue*1.2
  },
  'Maeles Cave Area': {
    BattleChance:       (player, baseValue) => baseValue*1.2,
    BattlePvPChance:    (player, baseValue) => baseValue*1.2
  },
  'Norkos Fisheries Area': {
    BattleChance:       (player, baseValue) => baseValue*1.2,
    BattlePvPChance:    (player, baseValue) => baseValue*1.2
  }
};
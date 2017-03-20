
import * as _ from 'lodash';
import { Event } from '../event';

import { Equipment } from '../../../core/base/equipment';
import { ItemGenerator } from '../../../shared/item-generator';
import { MessageCategories } from '../../../shared/adventure-log';

export const WEIGHT = 306;

// Get given the opportunity to change items
export class FindItem extends Event {
  static WEIGHT = WEIGHT;

  static operateOn(player, opts = {}, forceItem) {

    let item = forceItem;

    if(!forceItem) {
      item = ItemGenerator.generateItem(null, player.calcLuckBonusFromValue(player.stats.luk), player.level);

      const playerItem = player.equipment[item.type];
      const text = playerItem.score > item.score ? 'weak' : 'strong';

      if(!player.canEquip(item) || item.score <= 0) {
        const message = `%player came across %item, but it was too ${text} for %himher, so %she sold it for %gold gold.`;
        const gold = player.sellItem(item);
        const parsedMessage = this._parseText(message, player, { gold, item: item.fullname });
        this.emitMessage({ affected: [player], eventText: parsedMessage, category: MessageCategories.ITEM });
        return;
      }
    }

    const id = Event.chance.guid();
    const message = `Would you like to equip «${item.fullname}»?`;
    const eventText = this.eventText('findItem', player, { item: item.fullname });
    const extraData = { item, eventText };

    const choices = ['Yes', 'No'];
    if(player.$pets.activePet) {
      choices.push('Pet');
    }
    player.addChoice({ id, message, extraData, event: 'FindItem', choices });

    return [player];
  }

  static makeChoice(player, id, response) {
    if(response === 'No') return;
    const choice = _.find(player.choices, { id });

    if((!_.includes(choice.choices, 'Pet') && response === 'Pet')) return Event.feedback(player, 'Invalid choice. Cheater.');

    const item = new Equipment(choice.extraData.item);

    if(response === 'Pet') {
      const pet = player.$pets.activePet;
      if(pet.inventoryFull()) return Event.feedback(player, 'Pet inventory full.');
      pet.addToInventory(item);
      const eventText = this._parseText('%player gave a fancy %item to %pet!', player, { item: item.fullname });
      this.emitMessage({ affected: [player], eventText, category: MessageCategories.ITEM });
    }

    if(response === 'Yes') {
      player.equip(item);
      this.emitMessage({ affected: [player], eventText: choice.extraData.eventText, category: MessageCategories.ITEM });
    }
  }
}


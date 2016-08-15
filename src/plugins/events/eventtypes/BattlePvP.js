
import _ from 'lodash';

import { Event } from '../../../core/base/event';
import { GameState } from '../../../core/game-state';

import { Battle as BattleClass } from '../../combat/battle';
import { Party as PartyClass } from '../../party/party';

import { MessageCategories } from '../../../shared/adventure-log';

export const WEIGHT = 300;

// Create a pvp battle
export class BattlePvP extends Event {
  static operateOn(player) {
    if(player.level <= 5) return;

    const allPlayers = _.reject(GameState.getInstance().getPlayers(), p => p.$battle);
    let opponent = null;

    // 1v1
    if(!player.party) {
      const partyInstance = new PartyClass({ leader: player });
      partyInstance.isBattleParty = true;

      opponent = _(allPlayers)
        .reject(p => p.party)
        .reject(p => p.level < player.level - 5 || p.level > player.level + 5)
        .sample();
      if(!opponent) return;

      const opponentParty = new PartyClass({ leader: opponent });
      opponentParty.isBattleParty = true;

    // XvX
    } else {
      opponent = _(allPlayers)
        .reject(p => p.level < player.level - 5 || p.level > player.level + 5)
        .reject(p => !p.party || p.party === player.party)
        .sample();
      if(!opponent) return;

    }

    const parties = [player.party, opponent.party];
    const players = _.flatten(_.map(parties, party => party.players));

    const introText = this.eventText('battle', player, { _eventData: { parties } });

    new BattleClass({ introText, parties });

    this.emitMessage({ affected: players, eventText: introText, category: MessageCategories.COMBAT });
  }
}

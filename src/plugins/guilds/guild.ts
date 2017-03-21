
import * as _ from 'lodash';

import { GameState } from '../../core/game-state';
import { primus } from '../../primus/server';
import { emitter as PlayerEmitter } from '../players/_emitter';

import {
  GuildReloadRedis,
  GuildKickRedis,
  GuildJoinRedis,
  GuildLeaveRedis,
  GuildInviteRedis,
  GuildDisbandRedis
} from '../scaler/redis';

const LEADER = 1;
const MOD = 3;
const MEMBER = 5;

type Rank = 1 | 3 | 5;

export class GuildMember {
  name: string;
  level: number;
  ascensionLevel: number;
  title: string;
  profession: string;
  rank: Rank;
  unacceptedInvite: boolean;
  lastSeen: number;
  joinedAt: number;
}

export class Guild {

  $noGuild?: boolean;
  $disbanding?: boolean;

  name: string;
  tag: string;
  leader: string;
  founded: number;
  level: number;
  gold: number;

  maxMembers: number;
  members: GuildMember[];

  taxRate: number;
  motd: string;

  $guildDb: any;

  constructor(guildDb) {
    this.$guildDb = guildDb;
  }

  init(opts: any) {
    _.extend(this, opts);
    if(!this.founded) this.founded = Date.now();
    if(!this.level) this.level = 1;
    if(!this.gold) this.gold = 0;
    if(!this.members) this.members = [];
    if(!this.taxRate) this.taxRate = 0;
    if(!this.maxMembers) this.maxMembers = 10;
    if(!this.motd) this.motd = `Welcome to ${this.name} [${this.tag}]!`;

    _.each(this.members, member => { if(member.rank > 5) member.rank = 5; });
  }

  updateAllOnlineMembers() {
    const state = GameState.getInstance();

    _.each(this.onlineMembers, member => {
      const player = state.getPlayer(member.name);
      if(!player) return;

      player._updateGuild();
    });
  }

  updateMember(player) {
    const member = _.find(this.members, { name: player.name });
    member.ascensionLevel = player.ascensionLevel;
    member.profession = player.professionName;
    member.level = player.level;
    member.title = player.title;

    this.save();
  }

  renameRetag(newGuildName) {
    const gameState = GameState.getInstance();
    _.each(this.onlineMembers, member => {
      const player = gameState.getPlayer(member.name);
      player.guildName = newGuildName;
    });
  }

  get onlineMembers() {
    return _.filter(this.members, member => member.lastSeen === 0);
  }

  isLeader(player) {
    const member = this.getMemberByName(player.name);
    return member.rank === LEADER;
  }

  isMod(player) {
    const member = this.getMemberByName(player.name);
    return member.rank <= MOD;
  }

  disband() {
    this.$disbanding = true;
    _.each(this.members, member => {
      this.kickMember(member);
    });

    GuildDisbandRedis(this.name);
    this.$guildDb.removeGuild(this);
  }

  updateLastSeen(player, online) {
    const member = this.getMemberByName(player.name);
    if(online) {
      member.lastSeen = 0;
    } else {
      member.lastSeen = Date.now();
    }

    this.save();
    this.updateAllOnlineMembers();
  }


  canKick(mod, member: GuildMember) {
    return mod.rank < member.rank || mod.rank <= MOD && member.unacceptedInvite;
  }

  kickMemberName(name) {
    this.kickMember(this.getMemberByName(name));
  }

  kickMember(member: GuildMember) {

    // check if they're online, remove guildName (basically, call memberLeave)
    const onlinePlayer = GameState.getInstance().getPlayer(member.name);

    if(onlinePlayer) {
      this.memberLeave(onlinePlayer);

      // check if member is even in guild (ie, could just be an invite)
      const memberInList = _.find(this.members, { name: member.name });
      this.members = _.without(this.members, memberInList);

      // if not online, dig into db and unset guildName
      this.$guildDb.removePlayerFromGuild(member.name);
      this.save();

    } else {
      GuildKickRedis(this.name, member.name);
    }

  }

  getMemberByName(name) {
    return _.find(this.members, { name });
  }

  private createMemberFromPlayer(player) {
    const oldMember = _.find(this.members, { name: player.name });
    if(oldMember) return oldMember;

    const member = new GuildMember();

    member.name = player.name;
    member.level = player.level;
    member.profession = player.professionName;
    member.ascensionLevel = player.ascensionLevel;
    member.title = player.title;

    return member;
  }

  memberJoinName(newMemberName, push = false) {
    this.memberJoin({ name: newMemberName }, push);
  }

  memberJoin(newMember, push = false) {

    const onlinePlayer = GameState.getInstance().getPlayer(newMember.name);
    if(onlinePlayer) {
      onlinePlayer.guildName = this.name;
      onlinePlayer.guildTaxRate = 0;

      const member = this.createMemberFromPlayer(onlinePlayer);

      member.unacceptedInvite = false;
      member.lastSeen = 0;

      // first person is leader
      if(!this.members.length) {
        member.rank = LEADER;
      } else {
        member.rank = MEMBER;
      }

      member.joinedAt = Date.now();

      if(push) {
        this.members.push(member);
      }

      onlinePlayer._saveSelf();
      onlinePlayer._updateGuild();
      onlinePlayer.update();

      primus.joinGuildChat(onlinePlayer);
      PlayerEmitter.emit('player:changeguildstatus', { player: onlinePlayer });

      this.save();
      this.updateAllOnlineMembers();

    } else {
      GuildJoinRedis(this.name, newMember.name);
    }
  }

  memberLeaveName(playerName) {
    this.memberLeave({ name: playerName });
  }

  memberLeave(player) {

    const onlinePlayer = GameState.getInstance().getPlayer(player.name);

    const memberInList = this.getMemberByName(player.name);

    if(onlinePlayer) {

      // pass leader onto someone else
      if(this.isLeader(memberInList) && this.members.length > 1) {
        const mods = _.filter(this.members, { rank: MOD });

        let random = null;

        if(mods.length === 0) {
          random = _.sample(_.reject(this.members, m => m.rank === LEADER));
        } else {
          random = _.sample(mods);
        }

        random.rank = LEADER;
        this.leader = random.name;
      }

      primus.leaveGuildChat(onlinePlayer);

      onlinePlayer.guildName = '';
      onlinePlayer.guildInvite = null;
      onlinePlayer.update();
      onlinePlayer._updateGuild();
      onlinePlayer._saveSelf();
      PlayerEmitter.emit('player:changeguildstatus', { player: onlinePlayer });

      this.members = _.without(this.members, memberInList);
      this.save();

      if(this.members.length === 0) {
        this.disband();
      }

      this.updateAllOnlineMembers();

    } else {
      GuildLeaveRedis(this.name, player.name);
    }
  }

  inviteMemberName(byName, playerName) {
    this.inviteMember({ name: byName }, { name: playerName });
  }

  inviteMember(by, player) {

    const onlinePlayer = GameState.getInstance().getPlayer(player.name);
    if(onlinePlayer) {
      player.guildInvite = {
        invitedAt: Date.now(),
        inviter: by.name,
        name: this.name,
        members: this.members.length,
        leader: this.leader,
        tag: this.tag,
        founded: this.founded
      };

      const newMember = this.createMemberFromPlayer(player);
      newMember.unacceptedInvite = true;
      this.members.push(newMember);

      this.save();
      player._saveSelf();
      player._updateGuild();

    } else {
      GuildInviteRedis(this.name, by.name, player.name);
    }
  }

  promoteMember(memberName: string) {
    const member = this.getMemberByName(memberName);
    member.rank -= 2;
    this.save();
    this.updateAllOnlineMembers();
  }

  demoteMember(memberName: string) {
    const member = this.getMemberByName(memberName);
    member.rank += 2;
    this.save();
    this.updateAllOnlineMembers();
  }

  donateGold(player, gold: number) {
    this.gold += gold;
    player.gold -= gold;

    player._updateGuild();
    player._saveSelf();
    this.save();
    // consciously not updating all members here - small update, not really worth it.
  }

  getTaxedAmount(player, gold: number) {
    const percent = player.guildTaxRate + this.taxRate;
    return Math.floor((percent/100) * gold);
  }

  payTaxes(player, taxes: number) {
    this.gold += taxes;
    player.gold -= taxes;

    this.save();
  }

  changeMOTD(motd: string) {
    this.motd = motd;
    this.save();
    this.updateAllOnlineMembers();
  }

  setTaxRate(taxRate: number) {
    this.taxRate = taxRate;
    this.save();
    // consciously not updating all members here - small update, not really worth it.
  }

  async save() {
    if(this.$disbanding) return;
    await this.$guildDb.saveGuild(this);

    GuildReloadRedis(this.name);
  }

  buildSaveObject() {
    const obj = _.omitBy(this, (val, key) => {
      return _.startsWith(key, '$')
        || _.isNotWritable(this, key)
    });

    return obj;
  }
}
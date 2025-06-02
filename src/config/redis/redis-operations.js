import { setRedisTTL } from "./redis-ttls.js";

export class RedisOperations {
  constructor(client) {
    this.client = client;
  }

  async _handleTTL(key, ttl) {
    if (ttl === false || ttl === 0) {
      return null;
    } else if (ttl === undefined) {
      await setRedisTTL(this.client, key, null);
    } else if (typeof ttl === "number" && ttl > 0) {
      await setRedisTTL(this.client, key, ttl);
    }
    return ttl;
  }

  // =============== STRING OPERATIONS ===============
  async setString(key, value, ttl = undefined) {
    await this.client.set(key, value);
    await this._handleTTL(key, ttl);
    return true;
  }

  async getString(key, refreshTTL = true) {
    const value = await this.client.get(key);
    if (value !== null && refreshTTL) {
      await this._handleTTL(key);
    }
    return value;
  }

  async increment(key, amount = 1) {
    return await this.client.incrby(key, amount);
  }

  async incrementWithTTL(key, amount = 1, ttl = undefined) {
    const value = await this.client.incrby(key, amount);
    await this._handleTTL(key, ttl);
    return value;
  }

  async decrement(key, amount = 1) {
    return await this.client.decrby(key, amount);
  }

  // =============== LIST OPERATIONS ===============
  async pushToList(key, ...values) {
    const result = await this.client.lPush(key, ...values);
    await this._handleTTL(key);
    return result;
  }

  async pushToListRight(key, ...values) {
    const result = await this.client.rPush(key, ...values);
    await this._handleTTL(key);
    return result;
  }

  async pushToListWithTTL(key, ttl = undefined, ...values) {
    const result = await this.client.lPush(key, ...values);
    await this._handleTTL(key, ttl);
    return result;
  }

  async pushToListRightWithTTL(key, ttl = undefined, ...values) {
    const result = await this.client.rPush(key, ...values);
    await this._handleTTL(key, ttl);
    return result;
  }

  async setListItem(key, index, value) {
    const result = await this.client.lSet(key, index, value);
    await this._handleTTL(key);
    return result;
  }

  async popFromList(key) {
    return await this.client.lPop(key);
  }

  async popFromListRight(key) {
    return await this.client.rPop(key);
  }

  async getListRange(key, start = 0, end = -1, refreshTTL = true) {
    const list = await this.client.lRange(key, start, end);
    if (list.length > 0 && refreshTTL) {
      await this._handleTTL(key);
    }
    return list;
  }

  async getListLength(key) {
    return await this.client.lLen(key);
  }

  async removeFromList(key, count, value) {
    return await this.client.lRem(key, count, value);
  }

  async trimList(key, start, end) {
    return await this.client.lTrim(key, start, end);
  }

  // =============== SET OPERATIONS ===============
  async addToSet(key, ...members) {
    const result = await this.client.sAdd(key, ...members);
    await this._handleTTL(key);
    return result;
  }

  async addToSetWithTTL(key, ttl = undefined, ...members) {
    const result = await this.client.sAdd(key, ...members);
    await this._handleTTL(key, ttl);
    return result;
  }

  async removeFromSet(key, ...members) {
    return await this.client.sRem(key, ...members);
  }

  async getSetMembers(key, refreshTTL = true) {
    const members = await this.client.sMembers(key);
    if (members.length > 0 && refreshTTL) {
      await this._handleTTL(key);
    }
    return members;
  }

  async isSetMember(key, member) {
    return await this.client.sIsMember(key, member);
  }

  async getSetSize(key) {
    return await this.client.sCard(key);
  }

  async getRandomSetMember(key, count = 1) {
    return count === 1
      ? await this.client.sRandMember(key)
      : await this.client.sRandMember(key, count);
  }

  async popFromSet(key, count = 1) {
    return count === 1
      ? await this.client.sPop(key)
      : await this.client.sPop(key, count);
  }

  async unionSets(...keys) {
    return await this.client.sUnion(...keys);
  }

  async intersectSets(...keys) {
    return await this.client.sInter(...keys);
  }

  async diffSets(...keys) {
    return await this.client.sDiff(...keys);
  }

  // =============== HASH OPERATIONS ===============
  async setHash(key, field, value, ttl = undefined) {
    const result = await this.client.hSet(key, field, value);
    await this._handleTTL(key, ttl);
    return result;
  }

  async setHashMultiple(key, fieldValuePairs, ttl = undefined) {
    const result = await this.client.hSet(key, fieldValuePairs);
    await this._handleTTL(key, ttl);
    return result;
  }

  async getHash(key, field, refreshTTL = true) {
    const value = await this.client.hGet(key, field);
    if (value !== null && refreshTTL) {
      await this._handleTTL(key);
    }
    return value;
  }

  async getAllHash(key, refreshTTL = true) {
    const hash = await this.client.hGetall(key);
    if (Object.keys(hash).length > 0 && refreshTTL) {
      await this._handleTTL(key);
    }
    return hash;
  }

  async deleteHashField(key, ...fields) {
    return await this.client.hDel(key, ...fields);
  }

  async hashFieldExists(key, field) {
    return await this.client.hExists(key, field);
  }

  async getHashKeys(key) {
    return await this.client.hKeys(key);
  }

  async getHashValues(key) {
    return await this.client.hVals(key);
  }

  async getHashLength(key) {
    return await this.client.hLen(key);
  }

  // =============== UTILITY METHODS ===============
  async delete(key) {
    return await this.client.del(key);
  }

  async exists(key) {
    return await this.client.exists(key);
  }

  async expire(key, seconds) {
    return await this.client.expire(key, seconds);
  }

  async ttl(key) {
    return await this.client.ttl(key);
  }
}

//Export
export const createRedisOperations = (client) => {
  return new RedisOperations(client);
};

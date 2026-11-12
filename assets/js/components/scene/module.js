import Vue from 'vue'

const state = {
  money: 0,
  jobsPurchased: {},
  businessesOwned: {},
  legacyPoints: 0,
  legacySpent: 0,
  autoClickers: 0,
  lifetimePurchases: { jobs: {}, businesses: {} },
  lastUpdate: null
}

function resetRun (state) {
  state.money = 0
  state.jobsPurchased = {}
  state.businessesOwned = {}
  state.lastUpdate = null
}

function bump (counts, id) {
  if (undefined === counts[id]) {
    Vue.set(counts, id, 1)
  } else {
    counts[id] += 1
  }
}

const mutations = {
  ADD_MONEY (state, amount) {
    state.money += amount
  },

  SUBTRACT_MONEY (state, amount) {
    state.money -= amount
  },

  ADD_JOB (state, jobID) {
    bump(state.jobsPurchased, jobID)
    bump(state.lifetimePurchases.jobs, jobID)
  },

  ADD_BUSINESS (state, businessID) {
    bump(state.businessesOwned, businessID)
    bump(state.lifetimePurchases.businesses, businessID)
  },

  RESET (state) {
    resetRun(state)
    state.legacyPoints = 0
    state.legacySpent = 0
    state.autoClickers = 0
    state.lifetimePurchases = { jobs: {}, businesses: {} }
  },

  RETIRE (state, gain) {
    state.legacyPoints += gain
    resetRun(state)
  },

  BUY_AUTO_CLICKER (state) {
    state.legacySpent += 2
    state.autoClickers += 1
  },

  LOAD_FROM_STORAGE_OBJECT (state, storageObject) {
    const blacklist = ['jobs', 'businesses', 'socialClasses', 'socialClassLevels']

    if (storageObject.scene) {
      for (const key of Object.keys(storageObject.scene)) {
        if (blacklist.indexOf(key) === -1) {
          state[key] = storageObject.scene[key]
        }
      }
    }
  }
}

const actions = {
  addJob: ({ state, getters, rootState, commit }, jobID) => {
    commit('SUBTRACT_MONEY', getters.jobCost(jobID))
    commit('ADD_JOB', jobID)
  },

  addBusiness: ({ state, getters, rootState, commit }, businessID) => {
    commit('SUBTRACT_MONEY', getters.businessCost(businessID))
    commit('ADD_BUSINESS', businessID)
  },

  retire: ({ getters, commit }) => {
    commit('RETIRE', getters.legacyGain)
  },

  autoBuy: ({ getters, dispatch }) => {
    let target = getters.autoBuyTarget

    while (target && getters.money >= target.cost) {
      dispatch(target.action, target.id)
      target = getters.autoBuyTarget
    }
  }
}

const getters = {
  // Simple values
  money: (state) => state.money,
  jobsPurchased: (state) => state.jobsPurchased,
  businessesOwned: (state) => state.businessesOwned,
  legacyPoints: (state) => state.legacyPoints,
  legacyAvailable: (state) => state.legacyPoints - state.legacySpent,
  legacyMultiplier: (state) => 1 + 0.25 * state.legacyPoints,
  autoClickers: (state) => state.autoClickers,
  autoClickerCost: () => 2,
  lifetimePurchases: (state) => state.lifetimePurchases,
  autoBuyThreshold: () => 10,

  // One legacy point per order of magnitude of net worth above £1M.
  legacyGain (state, getters) {
    return Math.max(0, Math.floor(Math.log10(getters.netWorth)) - 5)
  },

  // Complex values
  moneyPerSecond (state, getters) {
    // Look at the purchases and correlate those to the items.
    let amount = 0

    for (const id of Object.keys(state.businessesOwned)) {
      amount += getters.businesses[id].moneyPerSecond * state.businessesOwned[id]
    }

    return amount * getters.legacyMultiplier + state.autoClickers * getters.moneyPerClick
  },

  // The unlocked item with the best income per £ of its next unit, or null.
  autoBuyTarget (state, getters) {
    const candidates = []

    for (const id of Object.keys(getters.jobs)) {
      candidates.push({
        action: 'addJob',
        id,
        purchases: state.lifetimePurchases.jobs[id] || 0,
        cost: getters.jobCost(id),
        income: state.autoClickers * getters.jobs[id].moneyPerClick * getters.legacyMultiplier
      })
    }

    for (const id of Object.keys(getters.businesses)) {
      candidates.push({
        action: 'addBusiness',
        id,
        purchases: state.lifetimePurchases.businesses[id] || 0,
        cost: getters.businessCost(id),
        income: getters.businesses[id].moneyPerSecond * getters.legacyMultiplier
      })
    }

    let best = null

    for (const candidate of candidates) {
      if (candidate.purchases < getters.autoBuyThreshold || candidate.income <= 0) {
        continue
      }
      if (!best || candidate.income / candidate.cost > best.income / best.cost) {
        best = candidate
      }
    }

    return best
  },

  moneyPerClick (state, getters) {
    // Look at the purchases and correlate those to the items.
    let amount = 30 // We always have at least 30.

    for (const id of Object.keys(state.jobsPurchased)) {
      amount += getters.jobs[id].moneyPerClick * state.jobsPurchased[id]
    }

    return amount * getters.legacyMultiplier
  },

  // How much will this job cost the next time it's purchased?
  jobCost (state, getters, rootState) {
    return (id) => {
      const numJobsPurchased = state.jobsPurchased[id] || 0
      return getters.jobs[id].baseCost * Math.pow(getters.jobs[id].scaleFactor, numJobsPurchased)
    }
  },

  // Get the image for this job.
  jobImage (state, getters, rootState) {
    return (id) => {
      const job = getters.jobs[id]
      const slug = job.label.toLowerCase().replace(/ /g, '-')
      return `./static/build/img/jobs/${slug}.png`
    }
  },

  // How much money has been spent purchasing jobs of this type?
  jobCompoundCost (state, getters, rootState) {
    return (id) => {
      let total = 0
      const iterations = state.jobsPurchased[id] - 1

      for (let x = 0; x <= iterations; x++) {
        total += getters.jobs[id].baseCost * Math.pow(getters.jobs[id].scaleFactor, x)
      }

      return total
    }
  },

  // What is the total amount spent on all jobs?
  jobsPurchasedCost (state, getters, rootState) {
    let total = 0

    for (const id of Object.keys(state.jobsPurchased)) {
      total += getters.jobCompoundCost(id)
    }

    return total
  },

  // How much will this business cost the next time it's purchased?
  businessCost (state, getters, rootState) {
    return (id) => {
      const numBusinessesOwned = state.businessesOwned[id] || 0
      return getters.businesses[id].baseCost * Math.pow(getters.businesses[id].scaleFactor, numBusinessesOwned)
    }
  },

  // Get the image for this business.
  businessImage (state, getters, rootState) {
    return (id) => {
      const business = getters.businesses[id]
      const slug = business.label.toLowerCase().replace(/ /g, '-')
      return `./static/build/img/businesses/${slug}.png`
    }
  },

  // How much money has been spent purchasing businesses of this type?
  businessCompoundCost (state, getters, rootState) {
    return (id) => {
      let total = 0
      const numOwned = state.businessesOwned[id]

      for (let x = 0; x < numOwned; x++) {
        total += getters.businesses[id].baseCost * Math.pow(getters.businesses[id].scaleFactor, x)
      }

      return total
    }
  },

  // What is the total amount spent on all jobs?
  businessesOwnedCost (state, getters, rootState) {
    let total = 0

    for (const id of Object.keys(state.businessesOwned)) {
      total += getters.businessCompoundCost(id)
    }

    return total
  }
}

export default {
  state,
  mutations,
  actions,
  getters
}

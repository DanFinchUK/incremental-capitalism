<template>
  <div class="lyt-Content">
    <div v-if="milestone" class="scn-Milestone">{{ milestone }}</div>
    <div v-for="f in floats" track-by="id" class="scn-Float" :style="{ left: f.x + 'px', top: f.y + 'px' }">+{{ f.amount | currency }}</div>
    <div class="lyt-Header">
      <div class="lyt-Columns">
        <div class="lyt-Column">
          <div class="lyt-Items">
            <div class="lyt-Item lyt-Item-buttonContainer">
              <h1>Your current social class: {{ $store.getters.socialClass.label }}</h1>
              <p>{{ $store.getters.socialClass.description }}</p>
              <progress class="scn-Progress" :value="$store.getters.netWorth" :max="$store.getters.nextSocialClass"></progress>
              <p v-if="$store.getters.nextSocialClass">Next social class in {{ ($store.getters.nextSocialClass - $store.getters.netWorth) | currency }}</p>
            </div>

            <div class="lyt-Item">
              <a class="scn-PrimaryAction" @click.prevent="getMoney($event)" href="#">Get paid</a>
            </div>
          </div>
        </div>

        <div class="lyt-Column">
          <div class="lyt-Items">
            <div class="lyt-Item">
              <div class="scn-DataTitle">Money:</div>
              <div class="scn-DataValue">{{ $store.getters.money | currency }}</div>
            </div>
            <div class="lyt-Item">
              <div class="scn-DataTitle">Net worth:</div>
              <div class="scn-DataValue">{{ $store.getters.netWorth | currency }}</div>
            </div>
            <div class="lyt-Item">
              <div class="scn-DataTitle">Money per second:</div>
              <div class="scn-DataValue">{{ $store.getters.moneyPerSecond | currency }}</div>
            </div>
            <div class="lyt-Item">
              <div class="scn-DataTitle">Money per click:</div>
              <div class="scn-DataValue">{{ $store.getters.moneyPerClick | currency }}</div>
            </div>
            <div class="lyt-Item">
              <div class="scn-DataTitle">Legacy:</div>
              <div class="scn-DataValue">{{ $store.getters.legacyPoints }} (x{{ $store.getters.legacyMultiplier }}), {{ $store.getters.legacyAvailable }} unspent</div>
              <a href="#" class="scn-Action" @click.prevent="retire" :title="retireTitle" :class="{
                'scn-Action-disabled': $store.getters.legacyGain < 1
              }">Retire for +{{ $store.getters.legacyGain }}</a>
            </div>
            <div class="lyt-Item">
              <div class="scn-DataTitle">Auto-clickers:</div>
              <div class="scn-DataValue">{{ $store.getters.autoClickers }}</div>
              <a href="#" class="scn-Action" @click.prevent="buyAutoClicker" title="Each auto-clicker pays out your click income once a second." :class="{
                'scn-Action-disabled': $store.getters.legacyAvailable < $store.getters.autoClickerCost
              }">Buy for {{ $store.getters.autoClickerCost }} legacy</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="lyt-Columns">
      <div class="lyt-Column">
        <div class="lyt-Items">
          <div class="lyt-Item">
            <h1 class="scn-ColumnTitle">Jobs</h1>
          </div>

          <div class="lyt-Item" v-for="(id, job) in $store.getters.jobs">
            <div class="lyt-ItemColumns">
              <div class="lyt-ItemColumn lyt-ItemColumn-image">
                <img :src="$store.getters.jobImage(id)" alt="">
              </div>

              <div class="lyt-ItemColumn lyt-ItemColumn-description">
                <h4>{{ job.label }} ({{ $store.getters.jobsPurchased[id] | default 0 }})</h4>
                <p>Cost to apply: {{ $store.getters.jobCost(id) | currency }}</p>
                <p>Income: {{ job.moneyPerClick | currency }} / click</p>
                <p>{{ autoStatus('jobs', id) }}</p>
              </div>

              <div class="lyt-ItemColumn lyt-ItemColumn-action">
                <a href="#" class="scn-Action" @click.prevent="getJob(id)" :class="{
                  'scn-Action-disabled': $store.getters.money < $store.getters.jobCost(id)
                }">Get hired</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lyt-Column">
        <div class="lyt-Items">
          <div class="lyt-Item">
            <h1 class="scn-ColumnTitle">Businesses</h1>
          </div>

          <div class="lyt-Item" v-for="(id, business) in $store.getters.businesses">
            <div class="lyt-ItemColumns">
              <div class="lyt-ItemColumn lyt-ItemColumn-image">
                <img :src="$store.getters.businessImage(id)" alt="">
              </div>

              <div class="lyt-ItemColumn lyt-ItemColumn-description">
                <h4>{{ business.label }} ({{ $store.getters.businessesOwned[id] | default 0 }})</h4>
                <p>Cost to start: {{ $store.getters.businessCost(id) | currency }}</p>
                <p>Income: {{ business.moneyPerSecond | currency }} / second</p>
                <p>{{ autoStatus('businesses', id) }}</p>
              </div>

              <div class="lyt-ItemColumn lyt-ItemColumn-action">
                <a href="#" class="scn-Action" @click.prevent="getBusiness(id)" :class="{
                  'scn-Action-disabled': $store.getters.money < $store.getters.businessCost(id)
                }">Get Businessed</a>
              </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="lyt-Footer">
    <div class="lyt-Item">
      <a href="#" class="scn-Action" @click.prevent="reset">Reset game</a>
    </div>
  </div>
</template>

<script type="text/ecmascript-6">
  import store from '../../store';


  export default {
    store,

    ready () {
      window.requestAnimationFrame(this.nextGameTick)
    },

    data () {
      return {
        floats: [],
        floatID: 0,
        milestone: null,
        milestoneTimer: null
      }
    },

    computed: {
      classLevel () {
        return store.getters.socialClassLevel
      },

      retireTitle () {
        const gain = store.getters.legacyGain
        if (gain < 1) {
          return 'Reach £1M net worth to earn legacy points'
        }
        return `Reset money, jobs and businesses. You keep your legacy, lifetime purchases and auto-clickers, and gain ${gain} point${gain === 1 ? '' : 's'}, each adding 25% income.`
      }
    },

    watch: {
      classLevel (newLevel, oldLevel) {
        if (newLevel > oldLevel) {
          this.celebrate(`You are now ${store.getters.socialClass.label}!`)
        }
      }
    },

    methods: {
      nextGameTick () {
        let delta = 0

        if (!this.lastUpdate) {
          this.lastUpdate = new Date()
        } else {
          const newUpdateTime = new Date()
          delta = newUpdateTime - this.lastUpdate

          this.lastUpdate = newUpdateTime
        }

        store.commit('ADD_MONEY', store.getters.moneyPerSecond / (1000 / delta))
        store.dispatch('autoBuy')

        window.requestAnimationFrame(this.nextGameTick)
      },

      autoStatus (kind, id) {
        const purchases = store.getters.lifetimePurchases[kind][id] || 0
        const threshold = store.getters.autoBuyThreshold
        if (purchases < threshold) {
          return `Auto-buy unlocks after ${threshold} purchases (${purchases} so far)`
        }
        if (kind === 'jobs' && store.getters.autoClickers < 1) {
          return 'Auto-buy unlocked. Jobs only pay out via auto-clickers.'
        }
        return 'Auto-buy unlocked'
      },

      buyAutoClicker () {
        if (store.getters.legacyAvailable < store.getters.autoClickerCost) {
          return false
        }
        store.commit('BUY_AUTO_CLICKER')
      },

      getMoney (event) {
        const amount = store.getters.moneyPerClick
        store.commit('ADD_MONEY', amount)
        this.showFloat(event, amount)
      },

      showFloat (event, amount) {
        const id = ++this.floatID
        this.floats.push({ id, amount, x: event.clientX, y: event.clientY })
        setTimeout(() => {
          this.floats = this.floats.filter((f) => f.id !== id)
        }, 900)
      },

      celebrate (message) {
        clearTimeout(this.milestoneTimer)
        this.milestone = message
        this.milestoneTimer = setTimeout(() => {
          this.milestone = null
        }, 4000)
      },

      getJob (jobID) {
        // Can the user afford to get this job?
        if (store.getters.money < store.getters.jobCost(jobID)) {
          // No.
          return false
        }

        // Yes.
        store.dispatch('addJob', jobID)
      },

      getBusiness (businessID) {
        // Can the user afford to get this job?
        if (store.getters.money < store.getters.businessCost(businessID)) {
          // No.
          return false
        }

        // Yes.
        store.dispatch('addBusiness', businessID)
      },

      reset () {
        if (window.confirm('Reset everything, including legacy points?')) {
          store.commit('RESET')
        }
      },

      retire () {
        const gain = store.getters.legacyGain
        if (gain < 1) {
          return false
        }
        if (window.confirm(`Retire for +${gain} legacy? Your money, jobs and businesses will be reset.`)) {
          store.dispatch('retire')
        }
      }
    }
  }
</script>

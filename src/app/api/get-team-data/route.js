import { NextResponse } from "next/server";
import { sql } from '@vercel/postgres';
import _ from 'lodash';
import { tidy, mutate, mean, select, summarizeAll, groupBy, summarize, first, n, median, total, arrange, asc, slice } from '@tidyjs/tidy';
import { calcEPA, calcAuto, calcTele, calcEnd } from "../../../util/calculations.js";

export const revalidate = 300; // Cache for 5 minutes

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get('team');

  if (!_.isNumber(+team)) {
    return NextResponse.json({ message: "ERROR: Invalid team number" }, { status: 400 });
  }

  // Fetch team data from database
  let data = await sql`SELECT * FROM phr2025 WHERE team = ${team};`;
  const rows = data.rows;

  if (rows.length === 0) {
    return NextResponse.json({ message: `ERROR: No data for team ${team}` }, { status: 404 });
  }

  function byAveragingNumbers(index) {
    if (['noshow', 'leave', 'breakdown', 'defense', 'cageattempt'].includes(index)) {
      return arr => arr.some(row => row[index] === true);
    }
    if (['scoutname', 'generalcomments', 'breakdowncomments', 'defensecomments'].includes(index)) {
      return arr => arr.map(row => row[index]).filter(a => a != null).join(" - ") || null;
    }
    if (['coralspeed', 'processorspeed', 'netspeed', 'algaeremovalspeed', 'climbspeed', 'maneuverability', 'defenseplayed', 'defenseevasion', 'aggression', 'cagehazard'].includes(index)) {
      return arr => {
        let filtered = arr.filter(row => row[index] != -1 && row[index] != null).map(row => row[index]);
        return filtered.length === 0 ? -1 : mean(filtered);
      };
    }
    return mean(index);
  }

  let teamTable = tidy(rows, mutate({
    auto: rec => calcAuto(rec),
    tele: rec => calcTele(rec),
    end: rec => calcEnd(rec),
    epa: rec => calcEPA(rec) // Ensure EPA is using the correct calculation
}));


  function rowsToArray(x, index) {
    return x.map(row => row[index]).filter(val => val != null);
  }

  function percentValue(arr, index, value) {
    return arr.filter(e => e[index] === value).length / arr.length;
  }

  // fetch team name from blue alliance api, commented our for now while testing getting from the backend
  const teamName = await fetch(`https://www.thebluealliance.com/api/v3/team/frc${team}/simple`, {
    headers: {
      "X-TBA-Auth-Key": process.env.TBA_AUTH_KEY,
      "Accept": "application/json"
    },
  })
  .then(resp => {
    if (resp.status !== 200) {
      console.error(`TBA API Error: Received status ${resp.status}`);
      return null;  // Return null if the request fails
    }
    return resp.json();
  })
  .then(data => {
    if (!data || !data.nickname) { 
      console.warn(`TBA API Warning: No nickname found for team ${team}`);
      return "";  // Provide a default fallback
    }
    return data.nickname;
  });


  const matchesScouted = teamTable.length;

  function standardDeviation(arr, key) {
    const values = arr.map(row => row[key]).filter(v => v !== null && v !== undefined);
    const avg = mean(values);
    const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
    return Math.sqrt(variance) || 0; // Avoid NaN if only one value
  }

  let returnObject = tidy(teamTable, summarize({
    team: first('team'),
    name: () => teamName,
    avgEpa: mean('epa'),
    avgAuto: mean('auto'),
    avgTele: mean('tele'),
    avgEnd: mean('end'),
    //add real data (mabe need to do calculations)
    last3Epa: arr => arr.slice(-3).reduce((sum, row) => sum + row.epa, 0) / Math.min(3, arr.length),
    last3Auto: arr => arr.slice(-3).reduce((sum, row) => sum + row.auto, 0) / Math.min(3, arr.length),
    last3Tele: arr => arr.slice(-3).reduce((sum, row) => sum + row.tele, 0) / Math.min(3, arr.length),
    last3End: arr => arr.slice(-3).reduce((sum, row) => sum + row.end, 0) / Math.min(3, arr.length),
  
    // Extract match and performance metrics
    epaOverTime: arr => tidy(arr, select(['epa', 'match'])),
    autoOverTime: arr => tidy(arr, select(['match', 'auto'])),
    teleOverTime: arr => tidy(arr, select(['match', 'tele'])),
  
    consistency: arr => {
      let breakdownRate = percentValue(arr, 'breakdown', true) * 100;
      let epaStdDev = standardDeviation(arr, 'epa');
      return 100 - (breakdownRate + epaStdDev);
    },

    lastBreakdown: arr => arr.filter(e => e.breakdowncomments !== null).reduce((a, b) => b.match, "N/A"),
    noShow: arr => percentValue(arr, 'noshow', true),

    breakdown: arr => {
  const uniqueMatches = new Set(arr.map(row => row.match));
  const uniqueBreakdownCount = Array.from(uniqueMatches).filter(match =>
    arr.some(row => row.match === match && row.breakdowncomments !== null)
  ).length;
  return (uniqueBreakdownCount / uniqueMatches.size) * 100;
    },

    defense: arr => {
      const uniqueMatches = new Set(arr.map(row => row.match));
      const uniqueDefenseCount = Array.from(uniqueMatches).filter(match =>
        arr.some(row => row.match === match && row.defensecomments !== null)
      ).length;
      return (uniqueDefenseCount / uniqueMatches.size) * 100;
    },

    matchesScouted: () => matchesScouted,
    scouts: arr => rowsToArray(arr, 'scoutname'),
    generalComments: arr => rowsToArray(arr, 'generalcomments'),
    breakdownComments: arr => rowsToArray(arr, 'breakdowncomments'),
    defenseComments: arr => rowsToArray(arr, 'defensecomments'),
    autoOverTime: arr => tidy(arr, select(['match', 'auto'])),
    teleOverTime: arr => tidy(arr, select(['match', 'tele'])),
    leave: arr => {
      const uniqueLeaveMatches = new Set(arr.filter(e => e.leave === true).map(e => e.match));
      return uniqueLeaveMatches.size / new Set(arr.map(e => e.match)).size || 0;
    },

    auto: arr => ({
      coral: {

      total: (() => {
        const totalSuccess = rows.reduce((sum, row) => 
            sum + (row.autol1success || 0) +
                   (row.autol2success || 0) +
                   (row.autol3success || 0) +
                   (row.autol4success || 0), 
        0);
        return totalSuccess / rows.length;
    })(),
    
        success: (() => {
          const totalSuccess = rows.reduce((sum, row) => sum + ((row.autol1success || 0) + (row.autol2success || 0) + (row.autol3success || 0) + (row.autol4success || 0)), 0);
          const totalAttempts = rows.reduce((sum, row) => sum + ((row.autol1success || 0) + (row.autol2success || 0) + (row.autol3success || 0) + (row.autol4success || 0) + (row.autol1fail || 0) + (row.autol2fail || 0) + (row.autol3fail || 0) + (row.autol4fail || 0)), 0);
          return totalAttempts > 0 ? (totalSuccess / totalAttempts) * 100 : 0;
        })(),
        avgL1: (() => rows.length ? rows.reduce((sum, row) => sum + (row.autol1success || 0), 0) / rows.length : 0)(),
        avgL2: (() => rows.length ? rows.reduce((sum, row) => sum + (row.autol2success || 0), 0) / rows.length : 0)(),
        avgL3: (() => rows.length ? rows.reduce((sum, row) => sum + (row.autol3success || 0), 0) / rows.length : 0)(),
        avgL4: (() => rows.length ? rows.reduce((sum, row) => sum + (row.autol4success || 0), 0) / rows.length : 0)(),


        successL1: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.autol1success || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.autol1fail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),
    
        successL2: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.autol2success || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.autol2fail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),
    
        successL3: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.autol3success || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.autol3fail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),
    
        successL4: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.autol4success || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.autol4fail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),

        
      },
      algae: {
        removed: (() => rows.length ? rows.reduce((sum, row) => sum + (row.autoalgaeremoved || 0), 0) / rows.length : 0)(),
        avgProcessor: (() => rows.length ? rows.reduce((sum, row) => sum + (row.autoprocessorsuccess || 0), 0) / rows.length : 0)(),
        avgNet: (() => rows.length ? rows.reduce((sum, row) => sum + (row.autonetsuccess || 0), 0) / rows.length : 0)(),
      
        successProcessor: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.autoprocessorsuccess || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.autoprocessorfail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),
      
        successNet: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.autonetsuccess || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.autonetfail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),
      },
      
    }),

    tele: arr => ({
      coral: {
        total: (() => {
          const totalSuccess = rows.reduce((sum, row) => 
              sum + (row.telel1success || 0) +
                     (row.telel2success || 0) +
                     (row.telel3success || 0) +
                     (row.telel4success || 0), 
          0);
          return totalSuccess / rows.length;
      })(),
      
    
    success: (() => {
          const totalSuccess = rows.reduce((sum, row) => sum + ((row.telel1success || 0) + (row.telel2success || 0) + (row.telel3success || 0) + (row.telel4success || 0)), 0);
          const totalAttempts = rows.reduce((sum, row) => sum + ((row.telel1success || 0) + (row.telel2success || 0) + (row.telel3success || 0) + (row.telel4success || 0) + (row.telel1fail || 0) + (row.telel2fail || 0) + (row.telel3fail || 0) + (row.telel4fail || 0)), 0);
          return totalAttempts > 0 ? (totalSuccess / totalAttempts) * 100 : 0;
        })(),
        
        avgL1: (() => rows.length ? rows.reduce((sum, row) => sum + (row.telel1success || 0), 0) / rows.length : 0)(),
        avgL2: (() => rows.length ? rows.reduce((sum, row) => sum + (row.telel2success || 0), 0) / rows.length : 0)(),
        avgL3: (() => rows.length ? rows.reduce((sum, row) => sum + (row.telel3success || 0), 0) / rows.length : 0)(),
        avgL4: (() => rows.length ? rows.reduce((sum, row) => sum + (row.telel4success || 0), 0) / rows.length : 0)(),

        successL1: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.telel1success || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.telel1fail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),

        successL2: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.telel2success || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.telel2fail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),

        successL3: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.telel3success || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.telel3fail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),

        successL4: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.telel4success || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.telel4fail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),

        
      },
      algae: {
        removed: (() => rows.length ? rows.reduce((sum, row) => sum + (row.telealgaeremoved || 0), 0) / rows.length : 0)(),
        avgProcessor: (() => rows.length ? rows.reduce((sum, row) => sum + (row.teleprocessorsuccess || 0), 0) / rows.length : 0)(),
        avgNet: (() => rows.length ? rows.reduce((sum, row) => sum + (row.telenetsuccess || 0), 0) / rows.length : 0)(),
      
        successProcessor: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.teleprocessorsuccess || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.teleprocessorfail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),
      
        successNet: (() => {
          const successes = rows.reduce((sum, row) => sum + (row.telenetsuccess || 0), 0);
          const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.telenetfail || 0), 0);
          return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
        })(),
      },
      
      avgHp: (() => {
        const validRows = rows.filter(row => row.hpsuccess !== null);
        return validRows.length ? validRows.reduce((sum, row) => sum + row.hpsuccess, 0) / validRows.length : 0;
      })(),
      successHp: (() => {
        const successes = rows.reduce((sum, row) => sum + (row.hpsuccess || 0), 0);
        const totalAttempts = successes + rows.reduce((sum, row) => sum + (row.hpfail || 0), 0);
        return totalAttempts > 0 ? (successes / totalAttempts) * 100 : 0;
      })(),


    }),

    endPlacement: arr => ({
      none: percentValue(rows, 'endlocation', 0) * 100,
      park: percentValue(rows, 'endlocation', 1) * 100,
      shallow: percentValue(rows, 'endlocation', 3) * 100,
      deep: percentValue(rows, 'endlocation', 4) * 100,
      parkandFail: percentValue(rows, 'endlocation', 2) * 100,
    }),


    attemptCage: arr => {
      const attemptCount = rows.filter(row => [2, 3, 4].includes(row.endlocation)).length;
      return rows.length > 0 ? attemptCount / rows.length * 100 : 0;
    },
    
    successCage: arr => {
      const successCount = rows.filter(row => [3, 4].includes(row.endlocation)).length;
      return rows.length > 0 ? successCount / rows.length * 100: 0;
    },
    
    
    

    qualitative: arr => [
      { name: "Coral Speed", rating: rows.length ? rows.reduce((sum, row) => sum + (row.coralspeed || 0), 0) / rows.length : 0 },
      { name: "Processor Speed", rating: rows.length ? rows.reduce((sum, row) => sum + (row.processorspeed || 0), 0) / rows.length : 0 },
      { name: "Net Speed", rating: rows.length ? rows.reduce((sum, row) => sum + (row.netspeed || 0), 0) / rows.length : 0 },
      { name: "Algae Removal Speed", rating: rows.length ? rows.reduce((sum, row) => sum + (row.algaeremovalspeed || 0), 0) / rows.length : 0 },
      { name: "Climb Speed", rating: rows.length ? rows.reduce((sum, row) => sum + (row.climbspeed || 0), 0) / rows.length : 0 },
      { name: "Maneuverability", rating: rows.length ? rows.reduce((sum, row) => sum + (row.maneuverability || 0), 0) / rows.length : 0 },
      { name: "Defense Played", rating: rows.length ? rows.reduce((sum, row) => sum + (row.defenseplayed || 0), 0) / rows.length : 0 },
      { name: "Defense Evasion", rating: rows.length ? rows.reduce((sum, row) => sum + (row.defenseevasion || 0), 0) / rows.length : 0 },
      { name: "Aggression*", rating: rows.length ? 5 - (rows.reduce((sum, row) => sum + (row.aggression || 0), 0) / rows.length) : 0 },
      { name: "Cage Hazard*", rating: rows.length ? 5 - (rows.reduce((sum, row) => sum + (row.cagehazard || 0), 0) / rows.length) : 0 },
    ],



    
  }));
  returnObject[0] = {
    ...returnObject[0],
    coralGroundIntake: rows.some(row => row.coralgrndintake === true),
    coralStationIntake: rows.some(row => row.coralstationintake === true),
    algaeGroundIntake: rows.some(row => row.algaegrndintake === true),
    algaeLowReefIntake: rows.some(row => row.algaelowreefintake === true),
    algaeHighReefIntake: rows.some(row => row.algaehighreefintake === true),
    lollipop: rows.some(row => row.lollipop === true),
  };


  // Then, update your aggregateByMatch function to ensure proper sorting:
function aggregateByMatch(dataArray) {
  return tidy(
    dataArray,
    groupBy("match", [
      summarize({
        epa: mean("epa"),
        auto: mean("auto"),
        tele: mean("tele"),
      }),
    ]),
    arrange([asc("match")]) // This ensures sorting by match number in ascending order
  );
}

// Apply the aggregation and sorting:
let processedEPAOverTime = aggregateByMatch(returnObject[0].epaOverTime);
let processedAutoOverTime = aggregateByMatch(returnObject[0].autoOverTime);
let processedTeleOverTime = aggregateByMatch(returnObject[0].teleOverTime);

returnObject[0].epaOverTime = processedEPAOverTime;
returnObject[0].autoOverTime = processedAutoOverTime;
returnObject[0].teleOverTime = processedTeleOverTime;
  

  console.log("Backend End Placement:", returnObject[0].defense);


  return NextResponse.json(returnObject[0], { status: 200 });
}
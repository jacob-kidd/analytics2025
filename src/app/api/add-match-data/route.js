import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import _ from "lodash";

// Field configuration for validation
const FIELD_CONFIG = {
  numbers: [
    'scoutteam', 'team', 'match', 'matchType',
    'autol1success', 'autol1fail', 'autol2success', 'autol2fail',
    'autol3success', 'autol3fail', 'autol4success', 'autol4fail',
    'autoalgaeremoved', 'autoprocessorsuccess', 'autoprocessorfail',
    'autonetsuccess', 'autonetfail', 'telel1success', 'telel1fail',
    'telel2success', 'telel2fail', 'telel3success', 'telel3fail',
    'telel4success', 'telel4fail', 'telealgaeremoved',
    'teleprocessorsuccess', 'teleprocessorfail', 'telenetsuccess',
    'telenetfail', 'hpsuccess', 'hpfail', 'endlocation',
    'coralspeed', 'processorspeed', 'netspeed', 'algaeremovalspeed',
    'climbspeed', 'maneuverability', 'defenseplayed', 'defenseevasion',
    'aggression', 'cagehazard'
  ],
  booleans: [
    'noshow', 'leave', 'breakdown', 'coralgrndintake',
    'coralstationintake', 'lollipop', 'algaegrndintake',
    'algaehighreefintake', 'algaelowreefintake'
  ],
  strings: [
    'scoutname', 'generalcomments', 'breakdowncomments', 'defensecomments'
  ]
};

export async function POST(req) {
  try {
    let body = await req.json();
    
    // Set default values for all fields
    const defaultBody = {
      scoutname: '',
      scoutteam: 0,
      team: 0,
      match: 0,
      matchType: 2,
      noshow: false,
      // Add other fields with appropriate defaults...
    };

    // Merge incoming data with defaults
    body = { ...defaultBody, ...body };

    // Convert numeric fields to numbers
    FIELD_CONFIG.numbers.forEach(field => {
      body[field] = Number(body[field]) || 0;
    });

    // Convert boolean fields to booleans
    FIELD_CONFIG.booleans.forEach(field => {
      body[field] = Boolean(body[field]);
    });

    // Ensure string fields are strings
    FIELD_CONFIG.strings.forEach(field => {
      body[field] = String(body[field] || '');
    });

    // Adjust match number based on match type
    const matchType = parseInt(body.matchType);
    let adjustedMatch = Number(body.match);
    
    switch (matchType) {
      case 0: adjustedMatch -= 100; break;
      case 1: adjustedMatch -= 50; break;
      case 3: adjustedMatch += 100; break;
    }

    // Validate required fields
    if (
      !body.scoutname ||
      !Number.isInteger(body.scoutteam) ||
      !Number.isInteger(body.team) ||
      !Number.isInteger(adjustedMatch)
    ) {
      return NextResponse.json(
        { message: "Invalid required fields" },
        { status: 400 }
      );
    }

    // Handle no-show case
    if (body.noshow) {
      await sql`
        INSERT INTO phr2025 (scoutname, scoutteam, team, match, matchtype, noshow)
        VALUES (${body.scoutname}, ${body.scoutteam}, ${body.team}, 
                ${adjustedMatch}, ${matchType}, ${body.noshow})
      `;
      return NextResponse.json({ message: "No-show recorded" });
    }

    // Validate quantitative data
    const quantitativeFields = [
      'autol1success', 'autol1fail', 'autol2success', 'autol2fail',
      'autol3success', 'autol3fail', 'autol4success', 'autol4fail',
      'telel1success', 'telel1fail', 'telel2success', 'telel2fail',
      'telel3success', 'telel3fail', 'telel4success', 'telel4fail'
    ];

    if (quantitativeFields.some(field => isNaN(body[field]))) {
      return NextResponse.json(
        { message: "Invalid quantitative data" },
        { status: 400 }
      );
    }

    // Insert full data
    await sql`
      INSERT INTO phr2025 (
        scoutname, scoutteam, team, match, matchtype, noshow, leave,
        autol1success, autol1fail, autol2success, autol2fail,
        autol3success, autol3fail, autol4success, autol4fail,
        autoalgaeremoved, autoprocessorsuccess, autoprocessorfail,
        autonetsuccess, autonetfail, telel1success, telel1fail,
        telel2success, telel2fail, telel3success, telel3fail,
        telel4success, telel4fail, telealgaeremoved,
        teleprocessorsuccess, teleprocessorfail, telenetsuccess,
        telenetfail, hpsuccess, hpfail, endlocation,
        coralspeed, processorspeed, netspeed, algaeremovalspeed,
        climbspeed, maneuverability, defenseplayed, defenseevasion,
        aggression, cagehazard, coralgrndintake, coralstationintake,
        lollipop, algaegrndintake, algaehighreefintake, algaelowreefintake,
        generalcomments, breakdowncomments, defensecomments
      ) VALUES (
        ${body.scoutname}, ${body.scoutteam}, ${body.team}, ${adjustedMatch}, ${matchType},
        ${body.noshow}, ${body.leave},
        ${body.autol1success}, ${body.autol1fail}, ${body.autol2success}, ${body.autol2fail},
        ${body.autol3success}, ${body.autol3fail}, ${body.autol4success}, ${body.autol4fail},
        ${body.autoalgaeremoved}, ${body.autoprocessorsuccess}, ${body.autoprocessorfail},
        ${body.autonetsuccess}, ${body.autonetfail}, ${body.telel1success}, ${body.telel1fail},
        ${body.telel2success}, ${body.telel2fail}, ${body.telel3success}, ${body.telel3fail},
        ${body.telel4success}, ${body.telel4fail}, ${body.telealgaeremoved},
        ${body.teleprocessorsuccess}, ${body.teleprocessorfail}, ${body.telenetsuccess},
        ${body.telenetfail}, ${body.hpsuccess}, ${body.hpfail}, ${body.endlocation},
        ${body.coralspeed}, ${body.processorspeed}, ${body.netspeed}, ${body.algaeremovalspeed},
        ${body.climbspeed}, ${body.maneuverability}, ${body.defenseplayed}, ${body.defenseevasion},
        ${body.aggression}, ${body.cagehazard}, ${body.coralgrndintake}, ${body.coralstationintake},
        ${body.lollipop}, ${body.algaegrndintake}, ${body.algaehighreefintake}, ${body.algaelowreefintake},
        ${body.generalcomments}, ${body.breakdowncomments}, ${body.defensecomments}
      )
    `;

    return NextResponse.json({ message: "Data recorded successfully" });

  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
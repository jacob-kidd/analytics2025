"use client";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import VBox from "./components/VBox";
import HBox from "./components/HBox";
import Comments from "./components/Comments";
import TwoByTwo from "./components/TwoByTwo";
import FourByTwo from "./components/FourByTwo";
import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, ResponsiveContainer, Cell, LineChart, Line, RadarChart, PolarRadiusAxis, PolarAngleAxis, PolarGrid, Radar, Legend, ReferenceLine } from 'recharts';

export default function TeamViewPage() {
    return <Suspense>
        <TeamView/>
      </Suspense>
  }

  function TeamView() {
    let data={
      team: 2485,
      name: "Overclocked",
      avgEpa: 73,
      avgAuto: 20,
      avgTele: 56,
      avgEnd: 12,
      last3Epa: 43,
      last3Auto: 5,
      last3Tele: 21,
      last3End: 2,
      epaOverTime: [{match: 3, epa: 60},{match: 10, epa: 43},{match: 13, epa: 12}],
      epaRegression: [{match: 3, epa: 60}, {match: 13, epa: 12}], //not sure how we should do this one
      stability: 98,
      defense: 11,
      lastBreakdown: 2,
      noShow: 1,
      breakdown: 9,
      matchesScouted: 3,
      scouts: ["Yael", "Ella", "Max"],
      generalComments: ["pretty good", "fragile intake","hooray!"],
      breakdownComments: ["stopped moving"],
      defenseComments: ["defended coral human player station"],
      autoOverTime: [{match: 8, score: 60},{match: 10, score: 10},{match: 13, score: 2}],
      leave: 93,
      auto: {
        coral: {
          total: 7,
          success: 88,
          avgL1: 3,
          avgL2: 4,
          avgL3: 7,
          avgL4: 1,
          successL1: 90,
          successL2: 87,
          successL3: 23,
          successL4: 100
        },
        algae: {
          removed: 1,
          avgProcessor: 0,
          avgNet: 1,
          successProcessor: 0,
          successNet: 100,
        },
      },
      tele: {
        coral: {
          total: 15,
          success: 82,
          avgL1: 9,
          avgL2: 3,
          avgL3: 6,
          avgL4: 2,
          successL1: 93,
          successL2: 81,
          successL3: 29,
          successL4: 80
        },
        algae: {
          removed: 3,
          avgProcessor: 2,
          avgNet: 4,
          successProcessor: 76,
          successNet: 11,
        },
        avgHp: 3,
        successHp: 13,
      },
      endPlacement: {
        none: 10,
        park: 20,
        deep: 12,
        shallow: 38,
        multi: 20,
      },
      attemptCage: 94,
      successCage: 68,
      qualitative: {
        coralSpeed: 6,
        processorSpeed: 4,
        netSpeed: 3,
        algaeRemovalSpeed: 5,
        climbSpeed: 3,
        maneuverability: 4,
        defensePlayed: 5,
        defenseEvasion: 0,
        aggression: 1,
        cageHazard: 2
      },
      coralGroundIntake: true,
      coralStationIntake: true,
      algaeGroundIntake: false,
      algaeReefIntake: false,
    }
    
    const Colors = [
      ["#116677", "#84C9D7", "#8CCCD9", "#C4EEF6"],
      ["#003F7E", "#84AED7", "#A2C8ED", "#D8EAFB"],
      ["#15007E", "#9D8CF3", "#BFB2FF", "#DDD6FF"],
      ["#9F5EB5", "#C284D7", "#DBA2ED", "#F3D8FB"],
    ]



    return (
      <div className={styles.MainDiv}>
        <div className={styles.leftColumn}>
          <h1 style={{color: Colors[0][0]}}>Team {data.team} View</h1>
          <h3>{data.name}</h3>
          <div className={styles.EPAS}>
            <div className={styles.EPA}>
              <div className={styles.scoreBreakdownContainer}>
                <div style={{background: Colors[0][1]}} className={styles.epaBox}>{data.avgEpa}</div>
                <div className={styles.epaBreakdown}>
                  <div style={{background: Colors[0][3]}}>A: {data.avgAuto}</div>
                  <div style={{background: Colors[0][3]}}>T: {data.avgTele}</div>
                  <div style={{background: Colors[0][3]}}>E: {data.avgEnd}</div>
                </div>
              </div>
            </div>
            <div className={styles.Last3EPA}>
              <div className={styles.scoreBreakdownContainer}>
                <div style={{background: "orange"}} className={styles.Last3EpaBox}>{data.last3Epa}</div>
                <div className={styles.epaBreakdown}>
                  <div style={{background: "yellow"}}>A: {data.last3Auto}</div>
                  <div style={{background: "green"}}>T: {data.last3Tele}</div>
                  <div style={{background: "red"}}>E: {data.last3End}</div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.graphContainer}>
            <h4 className={styles.graphTitle}>EPA Over Time</h4>
            <LineChart className={styles.lineChart} width={350} height={175} data={data.epaOverTime}>
              <XAxis type="number" dataKey="match"/>
              <YAxis dataKey="epa"/>
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Line type="monotone" dataKey="epa" stroke={Colors[0][0]} strokeWidth="3"/>
              <Tooltip></Tooltip>
            </LineChart>
          </div>
          <div className={styles.graphContainer}>
            <h4 className={styles.graphTitle}>Piece Placement</h4>
            <div>PIECE PLACEMENT BAR CHART</div>
          </div>
          <div className={styles.valueBoxes}>
            <VBox title={"Matches Scouted"} value={data.matchesScouted}/>
            <VBox title={"No Show"} value={data.noShow}/>
            <VBox title={"Defense"} value={data.defense}/>
            <VBox title={"Stability"} value={data.stability}/>
            <VBox title={"Breakdown"} value={data.breakdown}/>
            <VBox title={"Last Breakdown"} value={data.lastBreakdown}/>
            <HBox title={"Scouts"} value={(data.scouts).join(" | ")}/>
          </div>
          <Comments title={"General Comments"} value={(data.generalComments).join(" | ")}/>
          <Comments title={"Breakdown Comments"} value={(data.breakdownComments).join(" | ")}/>
          <Comments title={"Defense Comments"} value={(data.defenseComments).join(" | ")}/>
        </div>
      </div>
    )
  }
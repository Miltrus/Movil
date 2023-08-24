import { Injectable } from '@angular/core';
import { WayPointInterface } from '../models/waypoint.interface';

@Injectable({
  providedIn: 'root'
})
export class WaypointsService {

  packageIdToWaypointMap: Map<any, WayPointInterface> = new Map();
  waypointsKey = 'waypoitns'

  constructor() { }

  setWaypoints(waypoints: WayPointInterface[]) {
    localStorage.setItem(this.waypointsKey, JSON.stringify(waypoints));
  }

  getWaypoints(): WayPointInterface[] {
    const storedWaypoints = localStorage.getItem(this.waypointsKey);
    return storedWaypoints ? JSON.parse(storedWaypoints) : [];
  }

  associatePackageWithWaypoint(packageId: string, waypoint: WayPointInterface) {
    this.packageIdToWaypointMap.set(packageId, waypoint);
  }

  getPackageIdFromWaypoint(waypoint: any) {
    console.log('waypoint q recibi', waypoint)
    console.log('this.packageIdToWaypointMap', this.packageIdToWaypointMap);
    for (const [packageId, associatedWaypoint] of this.packageIdToWaypointMap) {
      if (associatedWaypoint == waypoint) {
        return packageId;
      }
    }
    return null;
  }
}
import { Injectable } from '@angular/core';
import { WayPointInterface } from '../models/waypoint.interface';

@Injectable({
  providedIn: 'root'
})
export class WaypointsService {

  private waypoints: WayPointInterface[] = [];
  private packageIdToWaypointMap: Map<string, WayPointInterface> = new Map();

  constructor() { }

  setWaypoints(waypoints: WayPointInterface[]) {
    this.waypoints = waypoints;
  }

  getWaypoints() {
    return this.waypoints;
  }

  associatePackageWithWaypoint(packageId: string, waypoint: WayPointInterface) {
    this.packageIdToWaypointMap.set(packageId, waypoint);
    console.log('pinga', this.packageIdToWaypointMap);
  }

  getPackageIdFromWaypoint(waypoint: WayPointInterface): string | null {
    console.log('way recibido', waypoint);
    console.log('la vuelta a comparar', this.packageIdToWaypointMap);
    for (const [packageId, associatedWaypoint] of this.packageIdToWaypointMap) {
      if (associatedWaypoint === waypoint) {
        return packageId;
      }
    }
    return null;
  }
}
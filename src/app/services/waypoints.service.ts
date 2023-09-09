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
  }

  removePackageIdWaypointAssociation(packageId: string) {
    this.packageIdToWaypointMap.delete(packageId);
  }


  getPackageIdFromWaypoint(waypoint: WayPointInterface): string | null {
    for (const [packageId, associatedWaypoint] of this.packageIdToWaypointMap) {
      if (
        associatedWaypoint.location.lat == waypoint.location.lat &&
        associatedWaypoint.location.lng == waypoint.location.lng
      ) {
        return packageId;
      }
    }

    return null;
  }

}
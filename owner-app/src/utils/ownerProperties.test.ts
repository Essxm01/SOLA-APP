import { getOwnerPropertyCollections, isPropertyActionRequired, primaryPropertyAction } from './ownerProperties';
import type { Property } from '../types';
const assert=(ok:boolean,message:string)=>{if(!ok)throw new Error(message)};
const p=(status:Property['status'])=>({id:status,status,updatedAt:'2026-08-24',images:[],title:status} as unknown as Property);
const all=['PUBLISHED','PENDING_REVIEW','DRAFT','REJECTED','PAUSED','SUSPENDED','ARCHIVED'].map(x=>p(x as Property['status']));
assert(isPropertyActionRequired('DRAFT'),'draft action');assert(isPropertyActionRequired('REJECTED'),'rejected action');assert(!isPropertyActionRequired('PENDING_REVIEW'),'review passive');
assert(getOwnerPropertyCollections(all,'action').map(x=>x.status).join(',')==='REJECTED,DRAFT','action filter');assert(getOwnerPropertyCollections(all,'review').length===1,'review filter');assert(getOwnerPropertyCollections(all,'other').length===3,'other filter');assert(primaryPropertyAction(p('DRAFT'))==='استكمال الوحدة','draft CTA');
console.log('OWNER-PROPERTIES-01 derivations passed.');


// Import the core angular services.
import { Component } from "@angular/core";
import { Location } from "@angular/common";
import { OnInit } from "@angular/core";
import { PopStateEvent } from "@angular/common";
import { Title } from "@angular/platform-browser";

// Import the application services.
import { Incident } from "./incident.service";
import { IncidentService } from "./incident.service";
import { Priority } from "./incident.service";
import { Quote } from "./quote.service";
import { QuoteService } from "./quote.service";
import { SlackSerializer } from "./slack-serializer";
import { Status } from "./incident.service";
import { Update } from "./incident.service";
import { _ } from "./lodash-extended";

var NEW_INCIDENT_ID_OVERLOAD = "new";

@Component({
	selector: "my-app",
	styleUrls: [ "./app.component.css" ],
	templateUrl: "./app.component.htm"
})
export class AppComponent implements OnInit {

	public duration: {
		hours: number;
		minutes: number;
	};
	public editForm: {
		update: Update;
		statusID: string;
		createdAt: Date | null;
		description: string;
	};
	public form: {
		description: string;
		priorityID: string;
		startedAt: Date | null;
		videoLink: string;
		updateStatusID: string;
		updateDescription: string;
		slackSize: number;
		slackFormat: string;
		slack: string;
	};
	public incident: Incident;
	public incidentID: string;
	public priorities: Priority[];
	public quote: Quote;
	public statuses: Status[];

	private incidentService: IncidentService;
	private location: Location;
	private quoteService: QuoteService;
	private slackSerializer: SlackSerializer;
	private title: Title;


	// I initialize the app component.
	constructor( 
		incidentService: IncidentService,
		location: Location,
		quoteService: QuoteService,
		slackSerializer: SlackSerializer,
		title: Title
		) {

		// Store injected properties.
		this.incidentService = incidentService;
		this.location = location;
		this.quoteService = quoteService;
		this.slackSerializer = slackSerializer;
		this.title = title;

		this.priorities = this.incidentService.getPriorities();
		this.statuses = this.incidentService.getStatuses();
		this.incident = null;
		this.incidentID = null;

		this.form = {
			description: "",
			priorityID: this.priorities[ 0 ].id,
			startedAt: null,
			videoLink: "",
			updateStatusID: this.statuses[ 0 ].id,
			updateDescription: "",
			slackSize: 5,
			slackFormat: "compact",
			slack: ""
		};

		this.editForm = {
			update: null,
			statusID: null,
			createdAt: null,
			description: null
		};

		this.duration = {
			hours: 0,
			minutes: 0
		};
		
		this.quote = this.quoteService.getRandomQuote();

	}


	// ---
	// PUBLIC METHODS.
	// ---


	// I add a new Update to the incident.
	public addUpdate() : void {

		// Ignore any empty update.
		if ( ! this.form.updateDescription ) {

			return;

		}

		var update = {
			id: Date.now(),
			status: _.find( this.statuses, [ "id", this.form.updateStatusID ] ),
			createdAt: new Date(),
			description: this.form.updateDescription
		};

		// Automatically apply the status of the new update to the overall status of 
		// the incident (assuming that statuses generally move "forward" as updates are
		// recorded).
		this.incident.status = update.status;
		this.incident.updates.push( update );
		this.incident.updates.sort( this.sortCreatedAtDesc );
		this.incidentService.saveIncident( this.incident );

		// Reset the content, but leave the status selection - it will likely be used by
		// the subsequent updates.
		this.form.updateDescription = "";

		this.form.slack = this.slackSerializer.serialize( this.incident, this.form.slackSize, this.form.slackFormat );

	}


	// I re-apply the form changes to the incident.
	public applyForm() : void {

		// If the startedAt form input emitted a NULL value, let's overwrite it with the
		// known value in the incident - we don't want any of the dates to be null.
		this.form.startedAt = ( this.form.startedAt || this.incident.startedAt );

		this.incident.description = this.form.description;
		this.incident.priority = _.find( this.priorities, [ "id", this.form.priorityID ] );
		this.incident.startedAt = this.form.startedAt;
		this.incident.videoLink = this.form.videoLink;
		this.incidentService.saveIncident( this.incident );

		this.updateDuration();
		this.updateTitle();

		this.form.slack = this.slackSerializer.serialize( this.incident, this.form.slackSize, this.form.slackFormat );

	}


	// I cancel the editing of the selected Update.
	public cancelEdit() : void {

		this.editForm.update = null;

	}


	// I delete the given update.
	public deleteUpdate( update: Update ) : void {

		if ( ! confirm( `Delete: ${ update.description }?` ) ) {

			return;

		}

		this.incident.updates = _.without( this.incident.updates, update );
		this.incidentService.saveIncident( this.incident );

		this.form.slack = this.slackSerializer.serialize( this.incident, this.form.slackSize, this.form.slackFormat );
		
	}


	// I select the given Update for editing.
	public editUpdate( update: Update ) : void {

		this.editForm.update = update;
		this.editForm.statusID = update.status.id;
		this.editForm.createdAt = update.createdAt;
		this.editForm.description = update.description;

	}


	// I get called once, after the component has been loaded.
	public ngOnInit() : void {

		this.title.setTitle( "Incident Commander" );

		// If there is a location path value, it should contain a persisted incident, 
		// try to load the incident from the path.
		if ( this.location.path() ) {

			this.applyLocation();

		}

		// Listen for changes to the location. This may indicate that we need to switch
		// over to a different incident.
		this.location.subscribe(
			( value: PopStateEvent ) : void => {

				this.applyLocation();

			}
		);

		this.setupDurationInterval();

	}


	// I save the changes to the currently-selected Update.
	public saveUpdateChanges() : void {

		var update = this.editForm.update;

		// Update the update item.
		update.status = _.find( this.statuses, [ "id", this.editForm.statusID ] );
		update.description = this.editForm.description;

		// Since the createdAt date is required for proper rendering and sorting of the
		// updates collection, we're only going to copy it back to the update if it is 
		// valid (otherwise fall-back to the existing date).
		update.createdAt = ( this.editForm.createdAt || update.createdAt );

		// Since the date of the update may have changed, re-sort the updates.
		this.incident.updates.sort( this.sortCreatedAtDesc );
		this.incidentService.saveIncident( this.incident );

		this.editForm.update = null;
		
		this.form.slack = this.slackSerializer.serialize( this.incident, this.form.slackSize, this.form.slackFormat );

	}


	// I start a new incident.
	public startNewIncident() : void {

		// Only prompt the user for confirmation if there is an existing incident ID that
		// we would be navigating away from.
		if ( this.incidentID && ! confirm( "Start a new incident (and clear the current incident data)?" ) ) {

			return;

		}

		// CAUTION: The incidentID is overloaded. Since the incident service provides a
		// new ID as part of the creation of a new service, we don't have a great way to
		// differentiate the "Loading" page for the first-time incident. As such, we're
		// overloading the incidentID to hold a special "new" value, which will indicate 
		// the selection (and subsequent loading) of a new incident. This value is really
		// only used in the VIEW to show the proper template.
		this.incidentID = NEW_INCIDENT_ID_OVERLOAD;
		this.incident = null;

		// Create, persist, and return the new incident.
		this.incidentService
			.startNewIncident()
			.then(
				( incident: Incident ) : void => {

					this.incidentID = incident.id;
					this.incident = incident;

					// Move the new incident data into the form.
					this.form.description = this.incident.description;
					this.form.priorityID = this.incident.priority.id;
					this.form.startedAt = this.incident.startedAt;
					this.form.videoLink = this.incident.videoLink;
					this.form.updateStatusID = this.statuses[ 0 ].id;
					this.form.updateDescription = "";
					this.form.slack = this.slackSerializer.serialize( this.incident, this.form.slackSize, this.form.slackFormat );

					// While this has nothing to do with the incident, let's cycle the 
					// header quote whenever a new incident is started.
					this.quote = this.quoteService.getRandomQuote();
					
					this.updateDuration();
					this.updateTitle();

					// Update the location so that this URL can now be copy-and-pasted
					// to other incident commanders.
					this.location.go( this.incidentID );

				}
			)
		;

	}


	// ---
	// PRIVATE METHODS.
	// ---


	// I attempt to parse the incident ID from the location and use it to load the 
	// given incident into the current application context.
	private applyLocation() : void {

		var path = this.location.path();

		// The location events get triggered more often than we need them to be. As such,
		// if the path already matches the incident ID, just ignore this request.
		if ( this.incidentID === path ) {

			return;

		}

		this.incidentID = path;
		this.incident = null;

		// Attempt to load the incident (may not exist).
		this.incidentService
			.getIncident( this.incidentID )
			.then(
				( incident: Incident ) : void => {

					this.incident = incident;

					// Move the new incident data into the form.
					this.form.description = this.incident.description;
					this.form.priorityID = this.incident.priority.id;
					this.form.startedAt = this.incident.startedAt;
					this.form.videoLink = this.incident.videoLink;
					this.form.updateStatusID = this.statuses[ 0 ].id;
					this.form.updateDescription = "";
					this.form.slack = this.slackSerializer.serialize( this.incident, this.form.slackSize, this.form.slackFormat );

					// While this has nothing to do with the incident, let's cycle the 
					// header quote whenever a new incident is started.
					this.quote = this.quoteService.getRandomQuote();
					
					this.updateDuration();
					this.updateTitle();

					// Update the location so that this URL can now be copy-and-pasted
					// to other incident commanders.
					this.location.go( this.incidentID );

				}
			)
			.catch(
				( error: any ) : void => {

					console.log( "Incident Failed To Load" );
					console.error( error );
					console.log( "ID:", this.incidentID );

					this.incidentID = null;
					this.incident = null;

					// Redirect back to the introductory view.
					this.location.go( "" );

				}
			)
		;

	}


	// I setup the duration interval that re-calculates the duration based on the start
	// time of the current incident.
	private setupDurationInterval() : void {

		// Update the duration every 30-seconds. While the duration only has minute-level
		// granularity, doing it every half-minute reduced the changes of it being stale
		// for 2 minutes.
		setInterval(
			() => {

				this.updateDuration();

			},
			( 1000 * 30 )
		);

		// Kick-off an update check immediately so we don't have to wait 30-seconds to 
		// render the duration for a persisted incident.
		this.updateDuration();

	}


	// I provide the comparator for the Update collection.
	// --
	// CAUTION: This function is passed by-reference, so "this" reference will not work
	// as expected in the context of this component.
	private sortCreatedAtDesc( a: Update, b: Update ) : number {

		if ( a.createdAt <= b.createdAt ) {

			return( -1 );

		} else {

			return( 1 );

		}

	}


	// I periodically update the duration based on the incident start time.
	private updateDuration() : void {

		var now = new Date();

		if ( this.incident && ( this.incident.startedAt <= now ) ) {

			var deltaSeconds = ( ( now.getTime() - this.incident.startedAt.getTime() ) / 1000 );
			var deltaMinutes = Math.floor( deltaSeconds / 60 );
			var deltaHours = Math.floor( deltaSeconds / 60 / 60 );

			this.duration.hours = deltaHours;
			this.duration.minutes = ( deltaMinutes - ( deltaHours * 60 ) );

		} else {

			this.duration.hours = 0;
			this.duration.minutes = 0;

		}

	}


	// I update the window title based on the current incident start date.
	private updateTitle() : void {

		var yearValue = this.incident.startedAt.getFullYear().toString();
		var monthValue = ( this.incident.startedAt.getMonth() + 1 ).toString(); // Adjust for zero-based month.
		var dayValue = this.incident.startedAt.getDate().toString();
		var hourValue = ( ( this.incident.startedAt.getHours() % 12 ) || 12 ).toString();
		var minuteValue = this.incident.startedAt.getMinutes().toString();
		var periodValue = ( this.incident.startedAt.getHours() < 12 )
			? "AM"
			: "PM"
		;

		// Ensure that we have two digits for all smaller fields.
		monthValue = ( "0" + monthValue ).slice( -2 );
		dayValue = ( "0" + dayValue ).slice( -2 );
		hourValue = ( "0" + hourValue ).slice( -2 );
		minuteValue = ( "0" + minuteValue ).slice( -2 );

		this.title.setTitle( `${ yearValue }/${ monthValue }/${ dayValue } @ ${ hourValue }:${ minuteValue } ${ periodValue } - Incident Commander` );

	}

}

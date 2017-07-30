
# Incident Commander

by [Ben Nadel][bennadel] (on [Google+][googleplus])

**[Run Incident Commander App][app]**

When an **Incident** is opened at [InVision App][invisionapp], one of the engineers has 
to run "point", acting as the liaison between the management / support teams and the 
engineers that are actively investigating the root cause. This point person is known as 
the "Incident Commander"; and, is responsible for communicating regular updates to one
of the company's Slack channels.

When I take on the role of Incident Commander, I like to use a specific format for my
Slack updates. If you've ever looked at my code, you know that I am very particular about
my formatting. These incident updates are no different. So, in order to make my life a 
little bit easier, I've put together a small Angular application that transforms incident 
updates into a tightly-formatted Slack message that I can quickly copy-and-paste into our
#Incident channel.

## Features

* **localStorage** - The current incident is stored in the browser's `localStorage` API.
  This way, if you refresh the page, or close your browser, re-opening the application 
  will automatically bring up the data from the current / most recent incident.
* **Local Timezone** - The #Incident channel has to be updated using the EST timezone.
  Which is difficult for the majority of people who are not on the east coast. In this 
  app, you can use your local timezone and the generated Slack message will automatically
  be formatted with EST times.
* **Configurable Formatting** - Depending on where you are in the incident process, you 
  may want to show more or less information (so as not to clutter up the Slack channel).
  This app allows you to change the number of updates that are rendered, and the 
  compactness of the timeline. This way, you can keep it compact mid-incident; then, 
  post a more comprehensive, more _readable_ version at the end.


[bennadel]: http://www.bennadel.com
[googleplus]: https://plus.google.com/108976367067760160494?rel=author
[invisionapp]: https://www.bennadel.com/invision/co-founder.htm
[app]: https://bennadel.github.io/Incident-Commander/

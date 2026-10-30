import Link from "next/link";
import type { ReactNode } from "react";
import { STORAGE_REGISTER, type LegalDocumentId } from "@/lib/legal";

export type LegalSection = {
  id: string;
  label: string;
  /** Reader heading depth: 0 for an H2 section, 1 for an H3 subsection. */
  depth: 0 | 1;
  body: ReactNode;
};

function StorageRegisterTable() {
  return (
    <div className="legal-table-wrap">
      <table className="legal-table">
        <thead>
          <tr>
            <th scope="col">Name or key</th>
            <th scope="col">Type</th>
            <th scope="col">Purpose</th>
            <th scope="col">Duration</th>
          </tr>
        </thead>
        <tbody>
          {STORAGE_REGISTER.map((entry) => (
            <tr key={`${entry.type}:${entry.name}`}>
              <td>
                <code>{entry.name}</code>
              </td>
              <td>{entry.type}</td>
              <td>{entry.purpose}</td>
              <td>{entry.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    id: "who-runs-this-site",
    label: "1. Who runs this site",
    depth: 0,
    body: (
      <>
        <p>
          This website is a personal engineering portfolio and writing workspace
          operated by <strong>Prasad Madhuranga</strong> (“I”, “me” or “the
          operator”), based in <strong>Kandy, Sri Lanka</strong>. I am
          responsible for deciding how personal data described in this policy is
          used on this site.
        </p>
        <p>
          You can contact me about privacy through the{" "}
          <Link href={"/contact"}>Contact page</Link>. Please do not send
          passwords, government identifiers, payment-card details or other
          highly sensitive information through the contact form.
        </p>
      </>
    ),
  },
  {
    id: "at-a-glance",
    label: "2. At a glance",
    depth: 0,
    body: (
      <>
        <ul>
          <li>
            There are <strong>no visitor accounts</strong>, advertising cookies,
            advertising identifiers, social-media tracking pixels or third-party
            analytics scripts on this site.
          </li>
          <li>
            Most appearance and reading preferences stay{" "}
            <strong>in your browser</strong>. The{" "}
            <Link href={"#cookies-and-browser-storage"}>
              cookie and browser-storage register
            </Link>{" "}
            lists them.
          </li>
          <li>
            Opening an article or other entry can add to{" "}
            <strong>first-party aggregate read counts</strong> by entry, day,
            country code and referring website hostname. Those aggregates are
            stored in Firebase; they are not an advertising profile.
          </li>
          <li>
            Personal data is sent to me only when you use an interactive feature
            — principally the contact form or guest comments — or when technical
            processing is needed to deliver and protect the site.
          </li>
          <li>
            I do <strong>not sell or rent personal data</strong>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "information-you-give-me",
    label: "3. Information you give me",
    depth: 0,
    body: <></>,
  },
  {
    id: "contact-enquiries",
    label: "3.1 Contact enquiries",
    depth: 1,
    body: (
      <>
        <p>
          When you use the contact form, I receive your name, email address,
          subject and message. A telephone number and one attachment (PDF, PNG,
          JPEG or text file up to 8 MB) are optional. The site relays the
          enquiry and any attachment to me through <strong>Telegram</strong> so
          I can read and reply to it. The site itself does not write the enquiry
          to a separate application database.
        </p>
        <p>
          I use contact enquiries only to understand and respond to your
          message, follow up where reasonably necessary, and keep a
          proportionate record of the correspondence. Please avoid sending
          information that is not needed for your enquiry.
        </p>
        <p>
          The protected “reveal email” control does not ask for your email
          address. It verifies a one-time Cloudflare Turnstile token before
          showing my contact address.
        </p>
      </>
    ),
  },
  {
    id: "comments",
    label: "3.2 Comments",
    depth: 1,
    body: (
      <>
        <p>
          Comments are public. If you post a guest comment, the site publishes
          your chosen display name, comment text and posting time with the
          entry. If you provide a GitHub, X (formerly Twitter) or LinkedIn
          handle and choose it as your comment source, that handle may be linked
          beside the comment and an avatar may be shown.
        </p>
        <p>
          Your email address is required for a guest comment so I can identify
          abuse, moderate the discussion and reply where needed.{" "}
          <strong>
            Your email address is stripped from the public comment feed and is
            not intended to be displayed publicly.
          </strong>{" "}
          The address is stored with the comment record in{" "}
          <strong>Notion</strong> and is included in the private operator
          notification sent through Telegram. An operator notification may also
          include the IP address and country code associated with the submission
          for moderation and security.
        </p>
        <p>
          If you provide a supported social handle, the server may query
          GitHub’s public API, an X profile lookup service or Unavatar to find
          the corresponding public avatar. The avatar URL can be stored with the
          comment and loaded by readers’ browsers from the relevant avatar host.
        </p>
        <p>
          The comment composer can remember your name, email address and
          optional handles in the <code>{"pm_commenter"}</code> cookie for 180
          days so you do not have to re-type them. It also keeps an unsent draft
          in your browser’s session storage. You can use the composer’s{" "}
          <strong>Forget me</strong> control to clear the remembered identity
          and local draft.
        </p>
        <p>
          Comments may be hidden or retained for moderation, security, context
          and record-keeping. If you want a comment corrected or deleted,
          contact me with the page address and the email address used for the
          comment so I can locate it.
        </p>
      </>
    ),
  },
  {
    id: "direct-correspondence",
    label: "3.3 Direct correspondence",
    depth: 1,
    body: (
      <>
        <p>
          If you contact me directly — for example by email or through a linked
          professional profile — I will receive the information you choose to
          send through that channel. The provider of that channel also processes
          the communication under its own terms and privacy policy.
        </p>
      </>
    ),
  },
  {
    id: "information-processed-automatically",
    label: "4. Information processed automatically",
    depth: 0,
    body: <></>,
  },
  {
    id: "delivery-security-and-abuse-prevention",
    label: "4.1 Delivery, security and abuse prevention",
    depth: 1,
    body: (
      <>
        <p>
          To serve pages and protect interactive features, the hosting and
          application servers necessarily process technical information such as
          IP address, browser/user-agent details, requested address, date and
          time, response status and similar request data. The application also
          uses IP-derived rate limits and short-lived in-memory abuse checks for
          comments, contact submissions, email reveal and owner sign-in.
        </p>
        <p>
          Cloudflare Turnstile may process browser and interaction signals to
          decide whether a protected action appears automated. The site verifies
          the resulting token with Cloudflare and does not store that token
          after the request.
        </p>
      </>
    ),
  },
  {
    id: "aggregate-readership-counts",
    label: "4.2 Aggregate readership counts",
    depth: 1,
    body: (
      <>
        <p>
          When an entry page is opened and remains visible briefly, the reader
          sends a first-party read “pulse”. The server increments aggregate
          counters in <strong>Google Firebase Realtime Database</strong> for:
        </p>
        <ul>
          <li>the entry and collection;</li>
          <li>the calendar day;</li>
          <li>
            the country code supplied by the hosting/network provider; and
          </li>
          <li>
            the hostname of the referring website, when the browser provides one
            — the full referring address is reduced to a hostname before
            storage.
          </li>
        </ul>
        <p>
          The server uses the IP address and user-agent only to create a keyed
          hash that discourages repeat counting within a 12-hour period. That
          hash is kept in server-process memory for de-duplication and is not
          written as a raw IP address or user-agent to the readership database.
          Known bots, prefetch requests and operator sessions are excluded by
          the application where they can be recognised.
        </p>
        <p>
          Readership counters help me understand which work is useful and where
          readers arrived from in aggregate. They are not used to build visitor
          profiles or target advertising. Because the stored counters are
          aggregated, I generally cannot identify or remove one person’s
          contribution to a counter after it has been added.
        </p>
      </>
    ),
  },
  {
    id: "content-and-external-media-requests",
    label: "4.3 Content and external media requests",
    depth: 1,
    body: (
      <>
        <p>
          Pages, images and files may be delivered from Notion or other media
          hosts. Entries can also contain YouTube embeds or remote media. When
          your browser loads that content, it communicates with the relevant
          host, which receives normal network and browser information and may
          set its own cookies or use similar technology under its own policy.
        </p>
      </>
    ),
  },
  {
    id: "owner-only-administration",
    label: "4.4 Owner-only administration",
    depth: 1,
    body: (
      <>
        <p>
          Operator sign-in uses HttpOnly session cookies and, where enabled by
          the operator, a trusted-browser cookie bound to browser/network
          context. Authentication alerts and administrative notifications may be
          sent to the operator through Telegram. Visitor browsing does not
          create an account or an administrator session.
        </p>
      </>
    ),
  },
  {
    id: "cookies-and-browser-storage",
    label: "5. Cookies and browser storage",
    depth: 0,
    body: (
      <>
        <p>
          Cookies are small files stored by your browser. Local storage, session
          storage and Cache Storage are browser storage areas controlled by this
          site’s code. The site uses the following first-party items for
          functionality, remembered preferences, offline reading and security:
        </p>
        <StorageRegisterTable />
        <p>
          The service-worker caches contain copies of public pages and assets
          already delivered to your browser. API responses, form submissions,
          the Bookmarks page and owner tools are not stored in or served from
          those caches.
        </p>
        <p>
          The site does not use first-party advertising or cross-site tracking
          cookies. Third-party media or avatar hosts may use their own
          technology when your browser requests their content, as described in
          section 4.3.
        </p>
        <p>
          You can delete or block cookies and site storage in your browser
          settings. The <strong>Reset this workspace</strong> control in
          Settings clears this site’s named cookies and local storage and
          removes visited offline pages and images. Reading public content does
          not require accepting optional preferences, but blocking storage can
          prevent appearance, window layout, saved items, reader preferences,
          offline reading and commenter prefill from persisting.
        </p>
      </>
    ),
  },
  {
    id: "why-i-use-personal-data",
    label: "6. Why I use personal data",
    depth: 0,
    body: (
      <>
        <p>I use the information described above only for these purposes:</p>
        <ul>
          <li>to present the portfolio, articles and interactive workspace;</li>
          <li>to remember preferences and items you choose to save;</li>
          <li>
            to publish, attribute and moderate comments you choose to post;
          </li>
          <li>to receive, respond to and administer enquiries;</li>
          <li>to count readership in aggregate and improve the site;</li>
          <li>
            to prevent spam, abuse, unauthorised access and technical misuse;
          </li>
          <li>
            to maintain security, diagnose faults and keep proportionate
            operational records; and
          </li>
          <li>
            to comply with a legal obligation or protect legal rights where
            necessary.
          </li>
        </ul>
        <p>
          Where a legal basis is required, I rely as appropriate on your consent
          for information you voluntarily submit or ask the browser to remember,
          my legitimate interests in operating, securing and improving a public
          portfolio, and legal obligations. You may withdraw consent for
          browser-saved information by clearing it; withdrawal does not
          automatically erase a comment or message already sent, but you may
          request deletion under section 10.
        </p>
      </>
    ),
  },
  {
    id: "who-receives-information",
    label: "7. Who receives information",
    depth: 0,
    body: (
      <>
        <p>
          I do not sell or rent personal data. Information is disclosed only to
          service providers and recipients needed for the purposes above:
        </p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th scope="col">Recipient</th>
                <th scope="col">Role on this site</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Vercel</strong>
                </td>
                <td>
                  Hosting, content delivery and request processing for the
                  current deployment
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Notion</strong>
                </td>
                <td>
                  Content management; native comment records; the operator's
                  private workspace records
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Google Firebase</strong>
                </td>
                <td>
                  Aggregate readership counters and hidden-comment moderation
                  state
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Telegram</strong>
                </td>
                <td>
                  Delivery of contact enquiries/attachments and operator
                  notifications
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Cloudflare</strong>
                </td>
                <td>
                  Turnstile bot-protection verification for protected actions
                </td>
              </tr>
              <tr>
                <td>
                  <strong>GitHub, FXTwitter and Unavatar</strong>
                </td>
                <td>
                  Public avatar lookup when you supply a supported comment
                  handle
                </td>
              </tr>
              <tr>
                <td>
                  <strong>YouTube and remote media/avatar hosts</strong>
                </td>
                <td>
                  Delivery of embedded videos, images and avatars requested by
                  your browser
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          These providers act under their own terms and security practices. I
          may also disclose information if required by law, to respond to a
          lawful request, to protect people or property, or to establish,
          exercise or defend legal claims.
        </p>
      </>
    ),
  },
  {
    id: "international-processing",
    label: "8. International processing",
    depth: 0,
    body: (
      <>
        <p>
          I operate the site from Sri Lanka, but the providers above may process
          and store information in other countries, including countries whose
          privacy protections differ from Sri Lanka. By using an interactive
          feature that relies on one of those providers, your information will
          be transmitted as technically necessary to provide the feature.
        </p>
      </>
    ),
  },
  {
    id: "how-long-information-is-kept",
    label: "9. How long information is kept",
    depth: 0,
    body: (
      <>
        <ul>
          <li>
            <strong>Browser storage:</strong> for the periods in section 5, or
            until you remove/clear it.
          </li>
          <li>
            <strong>Contact enquiries:</strong> only for as long as reasonably
            needed to respond, administer the enquiry and keep a proportionate
            correspondence record; Telegram also retains delivered messages
            under its own operation.
          </li>
          <li>
            <strong>Comments:</strong> while the relevant entry/comment remains
            published or retained for moderation and records, until I remove it
            or accept a deletion request. A hidden comment can remain in the
            underlying comment store while it is hidden from public view.
          </li>
          <li>
            <strong>Aggregate readership:</strong> until I reset or delete the
            aggregate counters; individual contributions are not separately
            identifiable in the stored totals.
          </li>
          <li>
            <strong>Moderation/security records:</strong> for as long as
            reasonably needed to moderate the comment, prevent abuse and protect
            the site.
          </li>
          <li>
            <strong>Host/provider logs:</strong> according to the relevant
            provider’s operation and retention schedules.
          </li>
        </ul>
        <p>
          Backups, provider systems and content copied or quoted by others
          before deletion may take additional time to disappear and may not be
          within my sole control.
        </p>
      </>
    ),
  },
  {
    id: "security",
    label: "10. Security",
    depth: 0,
    body: (
      <>
        <p>
          I use proportionate measures such as HTTPS, restricted owner
          authentication, HttpOnly administrator cookies, rate limits, input
          validation, public-field stripping for comment email addresses and
          provider access controls. No internet service or transmission method
          is completely secure. Please do not submit highly sensitive
          information through public comments or the contact form.
        </p>
      </>
    ),
  },
  {
    id: "your-choices-and-rights",
    label: "11. Your choices and rights",
    depth: 0,
    body: (
      <>
        <p>You can contact me to ask, where applicable:</p>
        <ul>
          <li>what identifiable information I hold about you;</li>
          <li>to correct inaccurate information;</li>
          <li>to delete a comment, enquiry or other identifiable record;</li>
          <li>to restrict or object to a particular use; or</li>
          <li>
            to withdraw consent for future use of information you voluntarily
            provided.
          </li>
        </ul>
        <p>
          I may need enough detail to locate the record and reasonably verify
          that the request relates to you — for a comment, the entry address and
          email address used are normally sufficient. I will respond within a
          reasonable time. Some information may need to be retained where
          required for security, accounting, legal claims or another lawful
          obligation, and aggregate read counts generally cannot be traced back
          to one visitor for removal.
        </p>
        <p>
          For browser-held data, the quickest route is to use{" "}
          <strong>Forget me</strong> in the comment composer,{" "}
          <strong>Reset this workspace</strong> in Settings, or your browser’s
          site-data controls.
        </p>
        <p>
          If you are in Sri Lanka, you may also contact the Data Protection
          Authority of Sri Lanka about data-protection concerns. Visitors
          elsewhere may have a right to contact their local data-protection
          authority.
        </p>
      </>
    ),
  },
  {
    id: "children",
    label: "12. Children",
    depth: 0,
    body: (
      <>
        <p>
          This is a general-audience portfolio and is not directed at children.
          If you are under 18, please obtain a parent’s or guardian’s permission
          before sending personal information through comments or the contact
          form. If I learn that a child’s personal information was submitted
          without appropriate permission, I will delete it where reasonably
          practicable after being notified.
        </p>
      </>
    ),
  },
  {
    id: "external-links-and-embeds",
    label: "13. External links and embeds",
    depth: 0,
    body: (
      <>
        <p>
          Entries may link to or embed material from other websites. I do not
          control those sites’ privacy practices. Please review the policy of
          any external service you visit or use.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-this-policy",
    label: "14. Changes to this policy",
    depth: 0,
    body: (
      <>
        <p>
          I may update this policy when the site’s features, providers or legal
          obligations change. The updated version will be published on this page
          with a new “last updated” date. Material changes to cookie or storage
          use will be highlighted through a new version of the site’s cookie
          notice. Please review this page periodically.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    label: "15. Contact",
    depth: 0,
    body: (
      <>
        <p>
          For a privacy question or request, use the{" "}
          <Link href={"/contact"}>Contact page</Link> and include “Privacy” in
          the subject where possible.
        </p>
      </>
    ),
  },
] as const;

const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    id: "about-this-site-and-these-terms",
    label: "1. About this site and these terms",
    depth: 0,
    body: (
      <>
        <p>
          This website is operated by <strong>Prasad Madhuranga</strong> (“I”,
          “me” or “the operator”), based in Kandy, Sri Lanka. It presents a
          personal engineering portfolio, projects, articles, tutorials, writing
          and an interactive desktop-style workspace.
        </p>
        <p>
          By accessing or using this site, you agree to these Terms and
          Conditions and to the{" "}
          <Link href={"/privacy-policy"}>Privacy Policy</Link> and{" "}
          <Link href={"/disclaimer"}>Disclaimer</Link>. If you do not agree,
          please do not use the site’s interactive features.
        </p>
      </>
    ),
  },
  {
    id: "what-the-site-provides",
    label: "2. What the site provides",
    depth: 0,
    body: (
      <>
        <p>
          The public site provides portfolio and written content, collection
          browsing and search, category and tag browsing, saved items in your
          own browser, comments on selected entries and a contact form.
        </p>
        <p>
          There is <strong>no visitor registration or account system</strong>.
          Administrative areas, APIs and owner utilities are restricted to the
          operator and are not public services, customer portals or
          professional-service offerings.
        </p>
        <p>
          I may add, change, suspend or remove content or features at any time.
          I do not guarantee that the site, an entry, a comment thread or any
          interactive feature will always be available, uninterrupted or
          error-free.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    label: "3. Acceptable use",
    depth: 0,
    body: (
      <>
        <p>When using this site, you must not:</p>
        <ul>
          <li>break applicable law or infringe another person’s rights;</li>
          <li>
            submit unlawful, defamatory, harassing, hateful, deceptive, obscene
            or otherwise harmful material;
          </li>
          <li>
            impersonate another person, use a misleading identity or publish
            someone else’s private information;
          </li>
          <li>
            send spam, unsolicited bulk messages or automated comment/contact
            submissions;
          </li>
          <li>
            upload malware or an attachment designed to harm, probe or disrupt a
            system;
          </li>
          <li>
            attempt to access owner-only areas, credentials, private records,
            non-public APIs or another person’s information;
          </li>
          <li>
            bypass or interfere with authentication, rate limits,
            bot-protection, security headers or moderation controls;
          </li>
          <li>
            scrape, crawl or call site endpoints at a rate or in a manner
            intended to burden or disrupt the service;
          </li>
          <li>
            misrepresent site content as current professional advice,
            certification, calculation approval or an endorsement by a third
            party; or
          </li>
          <li>
            use the site in a way that could damage its availability, integrity,
            security or reputation.
          </li>
        </ul>
        <p>
          Good-faith security research must be limited to your own activity and
          must not access, alter or exfiltrate private data or disrupt the site.
          Please report a suspected vulnerability privately through the{" "}
          <Link href={"/contact"}>Contact page</Link>.
        </p>
      </>
    ),
  },
  {
    id: "comments-and-other-submissions",
    label: "4. Comments and other submissions",
    depth: 0,
    body: (
      <>
        <p>
          Comments are public. When you post a comment, your chosen display
          name, comment and posting time may be shown with the entry. A GitHub,
          X or LinkedIn handle you choose as your comment source may be linked
          and an avatar may be displayed. Your email address is not intended to
          be displayed publicly; see the{" "}
          <Link href={"/privacy-policy"}>Privacy Policy</Link> for how it is
          handled.
        </p>
        <p>
          You are responsible for what you submit. By submitting a comment or
          other material for display, you confirm that you have the right to
          submit it and grant me a non-exclusive, worldwide, royalty-free
          licence to store, display, reproduce as technically necessary,
          moderate and keep a record of it in connection with the site. You
          retain any rights you hold in your submission.
        </p>
        <p>
          I may moderate, hide, edit for formatting/safety, refuse or remove a
          comment or submission at my discretion, including where it appears
          unlawful, abusive, spammy, misleading, irrelevant, unsafe or contrary
          to these terms. Moderation does not make me the author of a visitor’s
          comment and is not an endorsement of it.
        </p>
        <p>
          Do not place private, confidential or highly sensitive information in
          a public comment. Contact-form messages are treated as private
          enquiries and are not intentionally published on the site.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property-and-permitted-reuse",
    label: "5. Intellectual property and permitted reuse",
    depth: 0,
    body: (
      <>
        <p>
          Unless an item, entry, repository file or credit on the site states
          otherwise, original material authored by Prasad Madhuranga for this
          site is made available under the{" "}
          <strong>
            Creative Commons Attribution-NonCommercial-NoDerivatives 4.0
            International licence (CC BY-NC-ND 4.0)
          </strong>
          :{" "}
          <a
            href={"https://creativecommons.org/licenses/by-nc-nd/4.0/"}
            target="_blank"
            rel="noreferrer"
          >
            creativecommons.org/licenses/by-nc-nd/4.0
          </a>
        </p>
        <p>
          That statement does not replace a different licence, notice or
          permission attached to a specific item. Third-party and upstream
          material — including open-source components, adapted source files,
          fonts, icons, images, embedded media, quoted material and work by
          other authors — remains subject to its own licence and rights. Where a
          source file identifies adapted upstream code as AGPL-3.0 or another
          licence, that licence governs the relevant portion to the extent
          applicable.
        </p>
        <p>
          These terms do not grant you rights in the operator’s name, personal
          branding, logos or trademarks, or a right to imply endorsement. If you
          want to reuse material beyond the applicable licence — including
          commercially, in adapted form, in training data at scale or as part of
          another product — ask for permission through the{" "}
          <Link href={"/contact"}>Contact page</Link>.
        </p>
        <p>
          Nothing in this section is intended to take away a use that is
          permitted by applicable copyright exceptions or another licence that
          validly applies to the material.
        </p>
      </>
    ),
  },
  {
    id: "privacy-cookies-and-storage",
    label: "6. Privacy, cookies and storage",
    depth: 0,
    body: (
      <>
        <p>
          The <Link href={"/privacy-policy"}>Privacy Policy</Link> explains what
          information the site processes, including first-party preferences,
          guest comments, contact enquiries, aggregate readership and
          third-party providers. The cookie notice and the policy’s storage
          register explain the cookies and browser storage used by the
          workspace. By using an interactive feature, you acknowledge the
          processing technically necessary for that feature as described in the
          policy.
        </p>
      </>
    ),
  },
  {
    id: "third-party-services-and-links",
    label: "7. Third-party services and links",
    depth: 0,
    body: (
      <>
        <p>
          This site is built on and may link to services outside my control,
          including hosting and delivery providers, Notion, Google Firebase,
          Telegram, Cloudflare Turnstile, GitHub, avatar lookup/hosting
          services, YouTube and other websites referenced in entries.
        </p>
        <p>
          Third-party content, availability, security, accuracy and privacy
          practices are the responsibility of the relevant provider. A link,
          embed, tool mention or service name is not an endorsement. Your use of
          a third-party service may be subject to its own terms.
        </p>
      </>
    ),
  },
  {
    id: "no-professional-engagement",
    label: "8. No professional engagement",
    depth: 0,
    body: (
      <>
        <p>
          Viewing this site, reading an entry, posting a comment or sending the
          contact form does not by itself create an engineer–client,
          consultant–client, employment, partnership or other professional
          relationship. Any engagement must be separately agreed in writing. The{" "}
          <Link href={"/disclaimer"}>Disclaimer</Link> explains the limits of
          the site’s educational and portfolio content.
        </p>
      </>
    ),
  },
  {
    id: "availability-as-is-use-and-liability",
    label: "9. Availability, “as is” use and liability",
    depth: 0,
    body: (
      <>
        <p>
          The site and its content are provided{" "}
          <strong>“as is” and “as available”</strong>, without warranties of
          accuracy, completeness, merchantability, fitness for a particular
          purpose or non-infringement to the maximum extent permitted by law.
          You are responsible for independently verifying information,
          calculations, code and instructions before relying on them, especially
          where safety, compliance, cost or production use is involved.
        </p>
        <p>
          To the maximum extent permitted by law, I will not be liable for
          indirect, incidental, special, consequential or punitive loss, or for
          loss of profit, revenue, opportunity, data or goodwill arising from
          use of or inability to use the site. Nothing in these terms excludes
          or limits liability that cannot lawfully be excluded or limited.
        </p>
        <p>
          You remain responsible for your submissions, attachments, reliance on
          site material and compliance with law and third-party rights.
        </p>
      </>
    ),
  },
  {
    id: "restricting-access",
    label: "10. Restricting access",
    depth: 0,
    body: (
      <>
        <p>
          I may rate-limit, block, hide or remove submissions, or restrict
          access to interactive features or the site where reasonably necessary
          for security, moderation, provider limits, maintenance, legal
          compliance or enforcement of these terms. Owner-only access may be
          revoked at any time.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    label: "11. Governing law",
    depth: 0,
    body: (
      <>
        <p>
          These terms are governed by the laws of <strong>Sri Lanka</strong>.
          Subject to any non-excludable rights or jurisdiction rules that apply
          to you, disputes relating to these terms or the site are subject to
          the jurisdiction of the courts of Sri Lanka. Please contact me first
          through the <Link href={"/contact"}>Contact page</Link> so that a
          concern can be considered informally where possible.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-these-terms",
    label: "12. Changes to these terms",
    depth: 0,
    body: (
      <>
        <p>
          I may update these terms when the site, its providers or legal
          obligations change. The current version will be published on this page
          with its effective or last-updated date. Continuing to use the site
          after an updated version takes effect constitutes acceptance of the
          revised terms.
        </p>
      </>
    ),
  },
  {
    id: "general",
    label: "13. General",
    depth: 0,
    body: (
      <>
        <p>
          If a provision of these terms is held unenforceable, the remaining
          provisions continue to apply. A failure to enforce a provision on one
          occasion is not a waiver of the right to enforce it later. Headings
          are for readability only.
        </p>
        <p>
          Questions about these terms or a reuse request can be sent through the{" "}
          <Link href={"/contact"}>Contact page</Link>.
        </p>
      </>
    ),
  },
] as const;

const DISCLAIMER_SECTIONS: readonly LegalSection[] = [
  {
    id: "general-information-only",
    label: "1. General information only",
    depth: 0,
    body: (
      <>
        <p>
          This website is a personal engineering portfolio and knowledge
          notebook operated by <strong>Prasad Madhuranga</strong>. Projects,
          articles, tutorials, glossary entries, news, commentary, downloads and
          other material are provided for general information, education and
          portfolio purposes on an <strong>“as is”</strong> basis.
        </p>
        <p>
          I aim to keep material useful and accurate, but I make no
          representation or warranty — express or implied — that any content is
          complete, accurate, current, reliable, suitable or available for a
          particular purpose. Any reliance you place on site material is at your
          own risk, subject to rights that cannot lawfully be excluded.
        </p>
      </>
    ),
  },
  {
    id: "not-professional-engineering-advice",
    label: "2. Not professional engineering advice",
    depth: 0,
    body: (
      <>
        <p>
          Content on this site is not a substitute for advice, design review,
          calculation checking, testing or approval by a qualified and, where
          required, licensed professional who has examined the actual
          conditions.
        </p>
        <p>
          Engineering examples may involve structural or mechanical loads,
          machinery, automation and control, electrical or thermal systems,
          materials, manufacturing processes, CAD/model assumptions, numerical
          methods, software and safety-critical decisions. Do not use a
          published example as the sole basis for design release, fabrication,
          installation, operation, maintenance or regulatory compliance.
        </p>
        <p>
          Before acting, independently verify the governing codes and standards,
          units, input data, assumptions, boundary conditions, tolerances,
          material properties, versions and safety factors, and validate the
          result using appropriate calculations, simulation, prototyping and
          physical testing. Reading this site does not create an engineer–client
          or other professional relationship.
        </p>
      </>
    ),
  },
  {
    id: "code-calculations-and-project-material",
    label: "3. Code, calculations and project material",
    depth: 0,
    body: (
      <>
        <p>
          Code snippets and repositories are examples of a particular
          implementation at a point in time. They may contain defects, rely on
          outdated dependencies, omit production hardening or assume a specific
          environment. Review, test and adapt code under your own quality and
          security process before production use.
        </p>
        <p>
          Measurements, screenshots, specifications, drawings, simulations and
          results can reflect a prototype, a learning exercise or the equipment
          and conditions available when the work was done. Your results may
          differ. Project descriptions are portfolio records, not guarantees
          that the same outcome can be reproduced or that a similar outcome will
          be delivered for another brief.
        </p>
      </>
    ),
  },
  {
    id: "ai-assisted-entries",
    label: "4. AI-assisted entries",
    depth: 0,
    body: (
      <>
        <p>
          Where an entry displays the site’s <strong>AI-assisted</strong> badge,
          AI tools helped with parts of its production. That help can include
          drafting and restructuring prose, cleaning code, tables or diagrams,
          copy-editing for clarity and consistency, and summarising sources
          before human rewriting.
        </p>
        <p>
          The technical decisions, engineering judgement, measurements, figures,
          specifications and final read-through remain human responsibilities on
          badged entries. Even so, AI-assisted drafting can introduce a subtle
          error or overstate a source. Please treat exact numbers,
          version-specific claims and citations with the same care you would
          apply to any technical note: check the primary datasheet, standard,
          documentation or source before relying on them.
        </p>
        <p>
          The absence of a badge reflects how that entry was recorded in the
          content system; it is not a warranty about every tool used in
          research, drafting or production. If you spot a likely error, please
          report it through the <Link href={"/contact"}>Contact page</Link>.
        </p>
      </>
    ),
  },
  {
    id: "content-may-be-delayed-or-incomplete",
    label: "5. Content may be delayed or incomplete",
    depth: 0,
    body: (
      <>
        <p>
          Site content is managed through Notion and delivered through
          application and network caching. A correction or newly published
          status in the content system may take time to appear everywhere on the
          public site, and a provider outage or API/schema change may cause
          content to be unavailable or incomplete. Search indexes, copied
          snippets and third-party caches can remain out of date for longer.
        </p>
        <p>
          Publication and update dates are provided for context. Older material
          may not reflect later standards, product revisions, software versions,
          prices, laws or my current view.
        </p>
      </>
    ),
  },
  {
    id: "owner-tools-are-not-public-services",
    label: "6. Owner tools are not public services",
    depth: 0,
    body: (
      <>
        <p>
          Owner utilities in the workspace are restricted to the operator. They
          are not offered as public calculators, invoicing services, design
          validators or guaranteed generators. Their output requires human
          review and should not be treated as proof of accuracy, payment status,
          readership, licensing or fitness for a third-party purpose.
        </p>
        <p>
          Readership counters are aggregate operational signals, not audited
          circulation figures and not a measure of technical correctness.
        </p>
      </>
    ),
  },
  {
    id: "comments-external-links-and-embeds",
    label: "7. Comments, external links and embeds",
    depth: 0,
    body: (
      <>
        <p>
          Visitor comments and any attributed guest material express their
          authors’ own views. Moderation or publication does not mean I verify
          or endorse every statement.
        </p>
        <p>
          This site links to and may embed third-party material, including
          manufacturer documentation, open-source projects, videos and articles.
          I do not control and am not responsible for the content, accuracy,
          availability, products, services or privacy practices of an external
          site. A link or citation is provided for context and does not imply
          endorsement or sponsorship.
        </p>
      </>
    ),
  },
  {
    id: "errors-corrections-and-availability",
    label: "8. Errors, corrections and availability",
    depth: 0,
    body: (
      <>
        <p>
          Material may contain typographical, transcription, calculation,
          rendering or source errors. I may correct, update, retract or remove
          content at any time, and the site or a feature may be unavailable
          during maintenance or provider incidents.
        </p>
        <p>
          If you identify an error, a broken citation, an unsafe instruction or
          material that infringes your rights, please send the page address and
          enough detail to locate it through the{" "}
          <Link href={"/contact"}>Contact page</Link>. I will consider the
          report, but publication of a correction is not guaranteed.
        </p>
      </>
    ),
  },
  {
    id: "interaction-with-the-other-legal-pages",
    label: "9. Interaction with the other legal pages",
    depth: 0,
    body: (
      <>
        <p>
          This Disclaimer should be read with the{" "}
          <Link href={"/terms-and-conditions"}>Terms and Conditions</Link>,
          which govern use of the site, and the{" "}
          <Link href={"/privacy-policy"}>Privacy Policy</Link>, which explains
          personal-data handling. Nothing in this Disclaimer excludes or limits
          liability that cannot lawfully be excluded or limited.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-this-disclaimer",
    label: "10. Changes to this Disclaimer",
    depth: 0,
    body: (
      <>
        <p>
          I may update this Disclaimer when site content, tools or legal
          obligations change. The current version will be published on this page
          with its effective or last-updated date.
        </p>
      </>
    ),
  },
] as const;

export const LEGAL_DOCUMENT_SECTIONS: Record<
  LegalDocumentId,
  readonly LegalSection[]
> = {
  privacy: PRIVACY_SECTIONS,
  terms: TERMS_SECTIONS,
  disclaimer: DISCLAIMER_SECTIONS,
};

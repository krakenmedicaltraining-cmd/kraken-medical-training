"use strict";

(() => {

  const $ = selector =>
    document.querySelector(selector);

  const escape = value =>
    escapeHtml(String(value ?? ""));


  let simulations = [];
  let activeCategory = "";


  /* =========================================================
     HELPERS
     ========================================================= */

  function normaliseUrl(url) {

    return String(url || "").trim();

  }


  function lessonArray(course) {

    return Array.isArray(course.lessons)
      ? course.lessons
      : [];

  }


  function blockArray(course) {

    return Array.isArray(course.content_blocks)
      ? course.content_blocks
      : [];

  }


  function numberOrFallback(value, fallback = 10) {

    const number = Number(value);

    return Number.isFinite(number) && number > 0
      ? number
      : fallback;

  }


  /* =========================================================
     SIMULATION DESCRIPTION
     ---------------------------------------------------------
     IMPORTANT:
     We DO NOT fall back to the course description anymore.

     If a simulation doesn't have its own description,
     Kraken Sim displays a generic simulation message.
     ========================================================= */

  function simulationDescription(item) {

    return (
      item.simulation_description ||
      item.game_description ||
      item.description ||
      item.summary ||
      ""
    ).trim();

  }


  function defaultSimulationDescription() {

    return "Enter this interactive scenario and put your clinical decision-making to the test.";

  }


  /* =========================================================
     SIMULATION THUMBNAIL

     Priority:

     simulation_thumbnail_url
     game_thumbnail_url
     thumbnail_url
     thumbnail

     Course image is LAST RESORT only.
     ========================================================= */

  function simulationThumbnail(item, course) {

    return normaliseUrl(

      item.simulation_thumbnail_url ||

      item.game_thumbnail_url ||

      item.thumbnail_url ||

      item.thumbnail ||

      course?.simulation_thumbnail_url ||

      course?.game_thumbnail_url ||

      course?.thumbnail_url ||

      course?.cover_image_url ||

      ""

    );

  }


  /* =========================================================
     COURSE LEVEL SIMULATION
     ========================================================= */

  function simulationFromCourse(course) {

    if (
      !course.simulation_enabled ||
      !normaliseUrl(course.simulation_url)
    ) {

      return [];

    }


    return [{

      key:
        `course-${course.id}`,

      course_id:
        course.id,

      course_title:
        course.title,

      category:
        course.simulation_category ||
        course.category ||
        "Clinical",


      /* SIMULATION TITLE */

      title:
        course.simulation_title ||
        `${course.title} simulation`,


      /* SIMULATION DESCRIPTION ONLY */

      description:
        course.simulation_description ||
        "",


      url:
        normaliseUrl(
          course.simulation_url
        ),


      /* SIMULATION IMAGE */

      thumbnail:
        simulationThumbnail(
          {
            simulation_thumbnail_url:
              course.simulation_thumbnail_url
          },
          course
        ),


      difficulty:
        course.simulation_difficulty ||
        course.difficulty ||
        "All levels",


      minutes:
        numberOrFallback(
          course.simulation_minutes,
          10
        ),


      source:
        "Simulation"

    }];

  }


  /* =========================================================
     EMBEDDED LESSON SIMULATIONS
     ========================================================= */

  function simulationsFromLessons(course) {

    return lessonArray(course).flatMap(
      (lesson, index) => {


        const url =
          normaliseUrl(

            lesson.simulation_url ||

            lesson.unity_url ||

            lesson.game_url

          );


        if (!url) {

          return [];

        }


        return [{

          key:
            `lesson-${course.id}-${lesson.id || index}`,

          course_id:
            course.id,

          course_title:
            course.title,


          category:
            lesson.simulation_category ||
            lesson.game_category ||
            course.category ||
            "Clinical",


          title:
            lesson.simulation_title ||
            lesson.game_title ||
            (
              lesson.title
                ? `${lesson.title} simulation`
                : `${course.title} simulation`
            ),


          description:
            lesson.simulation_description ||
            lesson.game_description ||
            "",


          url,


          thumbnail:
            simulationThumbnail(
              lesson,
              course
            ),


          difficulty:
            lesson.simulation_difficulty ||
            lesson.difficulty ||
            course.difficulty ||
            "All levels",


          minutes:
            numberOrFallback(

              lesson.simulation_minutes ||
              lesson.estimated_minutes,

              10

            ),


          source:
            "Simulation"

        }];

      }
    );

  }


  /* =========================================================
     BLOCK SIMULATIONS
     ========================================================= */

  function simulationsFromBlocks(course) {

    return blockArray(course).flatMap(
      (block, index) => {


        const type =
          String(
            block.type || ""
          ).toLowerCase();


        const isSimulation = [

          "unity",
          "simulation",
          "game",
          "itch",
          "itchio",
          "webgl"

        ].includes(type);


        const url =
          normaliseUrl(

            block.url ||

            block.simulation_url ||

            block.game_url ||

            block.embed_url

          );


        if (
          !isSimulation ||
          !url
        ) {

          return [];

        }


        /*
          If the builder later adds:

          show_in_library: false

          this will hide the simulation
          from Kraken Sim.
        */

        if (
          block.show_in_library === false ||
          block.show_in_sim_library === false
        ) {

          return [];

        }


        return [{

          key:
            `block-${course.id}-${block.id || index}`,

          course_id:
            course.id,

          course_title:
            course.title,


          category:
            block.simulation_category ||
            block.game_category ||
            block.category ||
            course.category ||
            "Clinical",


          title:
            block.simulation_title ||
            block.game_title ||
            block.title ||
            `${course.title} simulation`,


          /*
            NO COURSE DESCRIPTION FALLBACK
          */

          description:
            block.simulation_description ||
            block.game_description ||
            block.description ||
            block.summary ||
            "",


          url,


          thumbnail:
            simulationThumbnail(
              block,
              course
            ),


          difficulty:
            block.simulation_difficulty ||
            block.difficulty ||
            course.difficulty ||
            "All levels",


          minutes:
            numberOrFallback(

              block.simulation_minutes ||
              block.minutes,

              10

            ),


          source:
            "Simulation"

        }];

      }
    );

  }


  /* =========================================================
     COURSE_LESSONS TABLE
     ========================================================= */

  async function simulationsFromLessonTable(
    courses
  ) {


    const courseIds =
      courses.map(
        course => course.id
      );


    if (!courseIds.length) {

      return [];

    }


    const result =
      await supabaseClient

        .from("course_lessons")

        .select("*")

        .in(
          "course_id",
          courseIds
        );


    if (result.error) {

      console.warn(
        "course_lessons could not be read:",
        result.error
      );

      return [];

    }


    const courseMap =
      new Map(

        courses.map(
          course => [
            String(course.id),
            course
          ]
        )

      );


    const output = [];


    (result.data || []).forEach(
      (lesson, index) => {


        const course =
          courseMap.get(
            String(
              lesson.course_id
            )
          );


        if (!course) {

          return;

        }


        /* -----------------------------------------
           DIRECT LESSON SIMULATION
           ----------------------------------------- */

        const directUrl =
          normaliseUrl(

            lesson.simulation_url ||

            lesson.unity_url ||

            lesson.game_url

          );


        if (directUrl) {


          output.push({

            key:
              `table-lesson-${lesson.id || index}`,

            course_id:
              course.id,

            course_title:
              course.title,


            category:
              lesson.simulation_category ||
              course.category ||
              "Clinical",


            title:
              lesson.simulation_title ||
              (
                lesson.title
                  ? `${lesson.title} simulation`
                  : `${course.title} simulation`
              ),


            description:
              lesson.simulation_description ||
              "",


            url:
              directUrl,


            thumbnail:
              simulationThumbnail(
                lesson,
                course
              ),


            difficulty:
              lesson.simulation_difficulty ||
              lesson.difficulty ||
              course.difficulty ||
              "All levels",


            minutes:
              numberOrFallback(

                lesson.simulation_minutes ||
                lesson.estimated_minutes,

                10

              ),


            source:
              "Simulation"

          });

        }


        /* -----------------------------------------
           BLOCKS SAVED INSIDE course_lessons.blocks
           ----------------------------------------- */

        const blocks =
          Array.isArray(lesson.blocks)
            ? lesson.blocks
            : [];


        blocks.forEach(
          (block, blockIndex) => {


            const type =
              String(
                block.type || ""
              ).toLowerCase();


            const isSimulation =
              [

                "unity",
                "simulation",
                "game",
                "itch",
                "itchio",
                "webgl"

              ].includes(type);


            const url =
              normaliseUrl(

                block.url ||

                block.simulation_url ||

                block.game_url ||

                block.embed_url

              );


            if (
              !isSimulation ||
              !url
            ) {

              return;

            }


            if (
              block.show_in_library === false ||
              block.show_in_sim_library === false
            ) {

              return;

            }


            output.push({

              key:
                `lesson-block-${lesson.id || index}-${block.id || blockIndex}`,

              course_id:
                course.id,

              course_title:
                course.title,


              category:
                block.simulation_category ||
                block.game_category ||
                block.category ||
                course.category ||
                "Clinical",


              title:
                block.simulation_title ||
                block.game_title ||
                block.title ||
                `${course.title} simulation`,


              description:
                block.simulation_description ||
                block.game_description ||
                block.description ||
                block.summary ||
                "",


              url,


              thumbnail:
                simulationThumbnail(
                  block,
                  course
                ),


              difficulty:
                block.simulation_difficulty ||
                block.difficulty ||
                course.difficulty ||
                "All levels",


              minutes:
                numberOrFallback(

                  block.simulation_minutes ||
                  block.minutes,

                  10

                ),


              source:
                "Simulation"

            });

          }
        );

      }
    );


    return output;

  }


  /* =========================================================
     REMOVE DUPLICATES
     ========================================================= */

  function deduplicate(items) {

    const seen =
      new Set();


    return items.filter(
      item => {


        const key =
          `${item.course_id}|${item.url}`;


        if (
          seen.has(key)
        ) {

          return false;

        }


        seen.add(key);

        return true;

      }
    );

  }


  /* =========================================================
     FILTER BUTTONS
     ========================================================= */

  function buildFilters() {


    const categories =
      [

        ...new Set(

          simulations

            .map(
              item =>
                item.category
            )

            .filter(Boolean)

        )

      ].sort();


    $("#simulationFilters").innerHTML =
      [

        `
        <button
          class="simulation-filter active"
          data-category=""
        >
          All
        </button>
        `,


        ...categories.map(
          category => `

            <button
              class="simulation-filter"
              data-category="${escape(category)}"
            >

              ${escape(category)}

            </button>

          `
        )

      ].join("");


    document
      .querySelectorAll(
        ".simulation-filter"
      )
      .forEach(
        button => {


          button.onclick =
            () => {


              activeCategory =
                button.dataset.category ||
                "";


              document
                .querySelectorAll(
                  ".simulation-filter"
                )
                .forEach(
                  item => {

                    item.classList.toggle(
                      "active",
                      item === button
                    );

                  }
                );


              render();

            };

        }
      );

  }


  /* =========================================================
     CARD
     ========================================================= */

  function simulationCard(item) {


    const description =
      simulationDescription(item) ||
      defaultSimulationDescription();


    const imageStyle =
      item.thumbnail

        ? `style="
            background-image:
              linear-gradient(
                180deg,
                rgba(4,20,16,.02),
                rgba(4,20,16,.48)
              ),
              url('${escape(item.thumbnail)}');
          "`

        : "";


    return `

      <article class="card simulation-card">


        <!-- ==============================
             GAME ART
             ============================== -->

        <div
          class="simulation-art"
          ${imageStyle}
        >


          <span class="simulation-source">
            KRAKEN SIM
          </span>


          <span class="simulation-controller">
            ◆
          </span>


          <div class="simulation-art-title">

            <small>
              INTERACTIVE SCENARIO
            </small>


            <h3>
              ${escape(item.title)}
            </h3>

          </div>


        </div>



        <!-- ==============================
             GAME INFORMATION
             ============================== -->

        <div class="simulation-copy">


          <div class="simulation-meta">


            <span>
              ${escape(item.category)}
            </span>


            <span>
              ${escape(item.difficulty)}
            </span>


            <span>
              ${Number(item.minutes || 10)}
              min
            </span>


          </div>



          <p class="simulation-description">

            ${escape(description)}

          </p>



          <!-- ============================
               LAUNCH
               ============================ -->

          <a
            class="button simulation-launch"
            href="${escape(item.url)}"
            target="_blank"
            rel="noopener"
            data-launch-simulation="${escape(item.key)}"
          >

            ▶ Launch simulation

          </a>



          <!-- ============================
               COURSE CROSS-SELL
               ============================ -->

          <div class="simulation-course-link">


            <span>
              PART OF
            </span>


            <a
              href="course.html?id=${encodeURIComponent(item.course_id)}"
            >

              ${escape(item.course_title)}

              →

            </a>


          </div>


        </div>


      </article>

    `;

  }


  /* =========================================================
     RENDER
     ========================================================= */

  function render() {


    const search =
      $("#simulationSearch")
        .value
        .trim()
        .toLowerCase();


    const filtered =
      simulations.filter(
        item => {


          const haystack =
            [

              item.title,

              item.course_title,

              item.category,

              item.description,

              item.difficulty

            ]

              .join(" ")

              .toLowerCase();


          return (

            (
              !activeCategory ||
              item.category ===
                activeCategory
            )

            &&

            haystack.includes(
              search
            )

          );

        }
      );


    $("#games").innerHTML =

      filtered.length

        ?

        filtered
          .map(simulationCard)
          .join("")

        :

        `

        <div class="empty-panel">

          No simulations match
          this search.

        </div>

        `;


    document
      .querySelectorAll(
        "[data-launch-simulation]"
      )
      .forEach(
        link => {


          link.addEventListener(
            "click",
            () => {


              if (
                window.KrakenAchievements
              ) {

                window
                  .KrakenAchievements
                  .recordSimulationLaunch(

                    link.dataset
                      .launchSimulation

                  );

              }

            }
          );

        }
      );

  }


  /* =========================================================
     LOAD
     ========================================================= */

  async function load() {


    const courses =
      await getPublicCoursesOnline();


    const embedded =
      courses.flatMap(
        course => [

          ...simulationFromCourse(
            course
          ),

          ...simulationsFromLessons(
            course
          ),

          ...simulationsFromBlocks(
            course
          )

        ]
      );


    const lessonTableItems =
      await simulationsFromLessonTable(
        courses
      );


    simulations =
      deduplicate(
        [

          ...embedded,

          ...lessonTableItems

        ]
      );


    buildFilters();

    render();

  }


  /* =========================================================
     EVENTS
     ========================================================= */

  $("#simulationSearch")
    .addEventListener(
      "input",
      render
    );


  /* =========================================================
     START
     ========================================================= */

  load().catch(
    error => {


      console.error(
        error
      );


      $("#games").innerHTML =
        `

        <div class="empty-panel">

          ${escape(
            error.message
          )}

        </div>

        `;

    }
  );

})();

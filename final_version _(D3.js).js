<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://d3js.org/d3.v6.min.js"></script>
    <style>
        html, body {
            overflow: hidden;
        }

        .links line {
            stroke: #999;
            stroke-opacity: 0.6;
        }

        .nodes circle {
            stroke: #fff;
            stroke-width: 1.5px;
        }

        .labels text {
            font-size: 12px;
        }

        .tooltip {
            position: absolute;
            text-align: center;
            padding: 5px;
            font: 12px sans-serif;
            background: lightsteelblue;
            border: 0px;
            border-radius: 8px;
            pointer-events: none;
            opacity: 0;
        }

        .details-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            border: 1px solid #999;
            border-radius: 8px;
            padding: 20px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            display: none;
        }

        .details-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .details-close {
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
        }

        .details-pagination {
            display: flex;
            justify-content: center;
            margin-top: 20px;
        }

        .details-previous,
        .details-next {
            cursor: pointer;
            padding: 5px 10px;
            background-color: #999;
            color: white;
            border-radius: 4px;
            margin: 0 5px;
        }
    </style>
</head>
<body>

<div style="margin-bottom: 20px;">
    <input type="text" id="search" placeholder="Search author..." style="padding: 5px;">
    <button onclick="search()">Search</button>
</div>

<svg id="graph" width="960" height="600"></svg>

<div class="details-container"></div>

<script>
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);


var svg = d3.select("#graph"),
    width = +svg.attr("width"),
    height = +svg.attr("height");


var zoom = d3.zoom()
    .scaleExtent([0.1, 10])
    .on("zoom", zoomed);
svg.call(zoom);


var g = svg.append("g");
var simulation;
var node;


function zoomed(event) {
    g.attr("transform", event.transform);
}

var pauseSimulation = false;
var isRunning = true;

d3.csv("IEEE VIS papers 1990-2021 - Main dataset.csv").then(function(data) {

    var authors = {};


    data.forEach(function(d) {
        var names = d['AuthorNames'].split(';');
        names.forEach(function(name) {
            if (!authors[name]) {
                authors[name] = {
                    collaborations: [],
                    articles: [],
                };
            }
            authors[name].collaborations =
            authors[name].collaborations.concat(names.filter(function(n) {
                return n !== name && authors[name].collaborations.indexOf(n) === -1;
            }));

            authors[name].articles.push(d);
        });
    });

    var nodes = Object.keys(authors).map(function(name) {
        return {id: name, collaborations: authors[name].collaborations.length, articles: authors[name].articles};
    });


    var links = [];


    Object.keys(authors).forEach(function(name) {
        authors[name].collaborations.forEach(function(coauthor) {
            links.push({source: name, target: coauthor});
        });
    });

    var graph = {
        nodes: nodes,
        links: links
    };

    simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, height / 2))

    var link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6);

    node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("r", function(d) { return Math.sqrt(d.collaborations); })
        .attr("fill", "#1f77b4")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)

        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);

            var articlesData = d.articles.map((article) => {
                return "Title: " + article.Title;
            }).join('<br/>');

            tooltip.html("AuthorNames: " + d.id + "<br/>" + articlesData)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })


        .on("mouseout", function(event, d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })


        .on("click", function(event, d) {
            showDetails(d);
            d3.select("body").style("overflow", "hidden");
        });


    var label = g.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(graph.nodes)
        .enter().append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(function(d) { return d.id; });


    simulation
        .nodes(graph.nodes)
        .on("tick", function() {

            link
                .attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });

            label
                .attr("x", function(d) { return d.x; })
                .attr("y", function(d) { return d.y; });
        });




    simulation.force("link")
        .links(graph.links);


    var detailsContainer = d3.select(".details-container");


    function showDetails(nodeData) {
        detailsContainer.html("");

        var details = detailsContainer.append("div")
            .attr("class", "details");

        var header = details.append("div")
            .attr("class", "details-header");

        header.append("h2")
            .text("Author Details: " + nodeData.id);

        var close = header.append("span")
            .attr("class", "details-close")
            .text("X");

        close.on("click", function() {
            detailsContainer.style("display", "none");
            d3.select("body").style("overflow", "auto");
            if (!pauseSimulation) {
                simulation.alpha(0.3).restart();
            }
        });

        var detailsContent = details.append("div")
            .attr("class", "details-content");

        var infoKeys = [
            "Conference",
            "Year",
            "Title",
            "AuthorNames",
            "DOI",
            "FirstPage",
            "LastPage",
            "PaperType",
            "Abstract",
            "AuthorNames-Deduped",
            "AuthorAffiliation",
            "AuthorKeywords",
            "AminerCitationCount",
            "CitationCount_CrossRef",
            "PubsCited_CrossRef",
            "Award",
            "Link"
        ];

        var articles = nodeData.articles;

        articles.forEach(function(article) {
            var articleContainer = detailsContent.append("div")
                .attr("class", "article-container");

            articleContainer.append("h3")
                .text(article.Title);

            infoKeys.forEach(function(key) {
                var value = article[key];

                if (key === "Link") {
                    articleContainer.append("div")
                        .attr("class", "detail-item")
                        .append("span")
                        .text(key + ": ");

                    articleContainer.append("div")
                        .attr("class", "detail-item")
                        .append("a")
                        .attr("href", value)
                        .attr("target", "_blank")
                        .text(value);
                } else {
                    articleContainer.append("div")
                        .attr("class", "detail-item")
                        .text(key + ": " + value);
                }
            });
        });

        detailsContainer.style("display", "block");
    }


    d3.select("body").on("keydown", function(event) {
        if (event.code === "Space") {
            if (isRunning) { // simulation is running
                simulation.stop();
                isRunning = false;
            } else { // simulation is stopped
                simulation.alpha(0.3).restart();
                isRunning = true;
            }
        }
    });



}).catch(function(error){
    console.log(error);
});

function search() {
    var input = document.getElementById('search').value;
    input = input.toLowerCase();
    simulation.stop();

    var counter = 0;
    var offset = 50;  // 偏移量可以根据你的需要进行调整

    node
        .attr('fill', function(d) {
            if (d.id.toLowerCase().includes(input)) {
                return 'red';
            } else {
                return '#1f77b4';
            }
        })
        .attr('r', function(d) {
            if (d.id.toLowerCase().includes(input)) {
                return Math.sqrt(d.collaborations) * 2;
            } else {
                return Math.sqrt(d.collaborations);
            }
        })
        .each(function(d) {
            if (d.id.toLowerCase().includes(input)) {
                d.fx = width / 2 + offset * counter;
                d.fy = height / 2 + offset * counter;
                counter++;
            } else {
                d.fx = null;
                d.fy = null;
            }
        });

    simulation.alpha(1).restart();
}


</script>
</body>
</html>

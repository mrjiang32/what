import global from "../../../global.js"

export default () => {
    if(global.args.debug) {
        global.server.app.get("/", (req, res) => {
            res.redirect("/graphql");
        })
    }
}
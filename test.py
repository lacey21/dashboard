import pandas as pd
import streamlit as st
import streamlit.components.v1 as components


st.set_page_config(page_title="Simple Sales Dashboard", page_icon=":bar_chart:", layout="wide")


if "tour_open" not in st.session_state:
    st.session_state.tour_open = False

if "tour_step" not in st.session_state:
    st.session_state.tour_step = 0


TOUR_STEPS = [
    {
        "target": "overview",
        "title": "Overview",
        "body": "This dashboard gives a quick view of sales performance with headline KPIs, charts, and a detailed table.",
    },
    {
        "target": "filters",
        "title": "Filters",
        "body": "Use the sidebar filters to narrow the dashboard by region and month. Every metric and chart updates from those selections.",
    },
    {
        "target": "kpis",
        "title": "KPI Cards",
        "body": "The top row summarizes total sales, total orders, total profit, and average order value for the current filter set.",
    },
    {
        "target": "sales_trend",
        "title": "Sales Trend",
        "body": "This chart compares sales and profit over time so you can quickly see whether growth is improving margin as well.",
    },
    {
        "target": "sales_by_region",
        "title": "Sales by Region",
        "body": "This bar chart shows which region contributes the most sales in the current selection.",
    },
    {
        "target": "detail_table",
        "title": "Detail Table",
        "body": "The table shows the underlying records behind the summary metrics so you can inspect the raw values.",
    },
]


def open_tour() -> None:
    st.session_state.tour_open = True
    st.session_state.tour_step = 0


def close_tour() -> None:
    st.session_state.tour_open = False


def next_tour_step() -> None:
    if st.session_state.tour_step < len(TOUR_STEPS) - 1:
        st.session_state.tour_step += 1
    else:
        st.session_state.tour_open = False


def previous_tour_step() -> None:
    if st.session_state.tour_step > 0:
        st.session_state.tour_step -= 1


def render_tour_popover(target: str) -> None:
    if not st.session_state.tour_open:
        return

    step = TOUR_STEPS[st.session_state.tour_step]
    if step["target"] != target:
        return

    is_first = st.session_state.tour_step == 0
    is_last = st.session_state.tour_step == len(TOUR_STEPS) - 1
    overlay_targets = {"sales_trend", "sales_by_region", "detail_table"}
    is_overlay = target in overlay_targets
    margin = "0.35rem 0 -5.5rem 0.75rem" if is_overlay else "0.35rem 0 0.9rem 0"
    width = "min(360px, calc(100% - 1.5rem))" if is_overlay else "100%"
    position = "relative"
    z_index = "30" if is_overlay else "1"

    st.markdown(
        f"""
        <div style="
            background: #fff8e7;
            border: 1px solid #f2c572;
            border-radius: 14px;
            padding: 16px 18px;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.10);
            margin: {margin};
            width: {width};
            position: {position};
            z-index: {z_index};
        ">
            <div style="font-size: 0.8rem; color: #8a5a00; margin-bottom: 0.2rem;">
                Walkthrough step {st.session_state.tour_step + 1} of {len(TOUR_STEPS)}
            </div>
            <div style="font-weight: 700; color: #2a2a2a; margin-bottom: 0.35rem;">
                {step["title"]}
            </div>
            <div style="color: #444; line-height: 1.45;">
                {step["body"]}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if is_overlay:
        st.markdown(
            """
            <style>
            div[data-testid="stHorizontalBlock"] button[kind] {
                position: relative;
                z-index: 31;
            }
            </style>
            """,
            unsafe_allow_html=True,
        )

    nav_cols = st.columns([1, 1, 1])
    with nav_cols[0]:
        st.button("Back", key=f"{target}_tour_back", disabled=is_first, on_click=previous_tour_step, use_container_width=True)
    with nav_cols[1]:
        label = "Finish" if is_last else "Next"
        st.button(label, key=f"{target}_tour_next", on_click=next_tour_step, use_container_width=True)
    with nav_cols[2]:
        st.button("Close", key=f"{target}_tour_close", on_click=close_tour, use_container_width=True)

    if is_overlay:
        st.markdown('<div style="margin-bottom: -3.5rem;"></div>', unsafe_allow_html=True)


components.html(
    """
    <script>
    const doc = window.parent.document;
    if (!doc.__dashboardQuestionShortcutBound) {
      doc.addEventListener("keydown", function(event) {
        if (event.key === "?" && !event.metaKey && !event.ctrlKey && !event.altKey) {
          const active = doc.activeElement;
          const isTyping = active && (
            active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.isContentEditable
          );
          if (isTyping) {
            return;
          }
          const buttons = Array.from(doc.querySelectorAll("button"));
          const button = buttons.find((item) => item.innerText.trim() === "?");
          if (button) {
            button.click();
          }
        }
      });
      doc.__dashboardQuestionShortcutBound = true;
    }
    </script>
    """,
    height=0,
)

st.title("Simple Sales Dashboard")
st.caption("A lightweight Streamlit dashboard with filters, KPI cards, and a trend chart.")
render_tour_popover("overview")

header_left, header_right = st.columns([6, 1])
with header_right:
    st.button("?", key="walkthrough_button", help="Open walkthrough", on_click=open_tour)

data = pd.DataFrame(
    [
        {"Month": "Jan", "Region": "North", "Sales": 12000, "Orders": 120, "Profit": 2800},
        {"Month": "Feb", "Region": "North", "Sales": 13500, "Orders": 128, "Profit": 3200},
        {"Month": "Mar", "Region": "North", "Sales": 14200, "Orders": 133, "Profit": 3500},
        {"Month": "Jan", "Region": "South", "Sales": 9800, "Orders": 100, "Profit": 2100},
        {"Month": "Feb", "Region": "South", "Sales": 10800, "Orders": 109, "Profit": 2400},
        {"Month": "Mar", "Region": "South", "Sales": 12500, "Orders": 117, "Profit": 2900},
        {"Month": "Jan", "Region": "West", "Sales": 11100, "Orders": 112, "Profit": 2500},
        {"Month": "Feb", "Region": "West", "Sales": 11950, "Orders": 118, "Profit": 2700},
        {"Month": "Mar", "Region": "West", "Sales": 13000, "Orders": 126, "Profit": 3100},
    ]
)

month_order = ["Jan", "Feb", "Mar"]

st.sidebar.header("Filters")
with st.sidebar:
    render_tour_popover("filters")

selected_regions = st.sidebar.multiselect(
    "Region",
    options=sorted(data["Region"].unique()),
    default=sorted(data["Region"].unique()),
)
selected_months = st.sidebar.multiselect("Month", options=month_order, default=month_order)

filtered = data[
    data["Region"].isin(selected_regions) &
    data["Month"].isin(selected_months)
].copy()

if filtered.empty:
    st.warning("No data matches the selected filters.")
    st.stop()

total_sales = int(filtered["Sales"].sum())
total_orders = int(filtered["Orders"].sum())
total_profit = int(filtered["Profit"].sum())
avg_order_value = total_sales / total_orders

render_tour_popover("kpis")
col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Sales", f"${total_sales:,}")
col2.metric("Orders", f"{total_orders:,}")
col3.metric("Profit", f"${total_profit:,}")
col4.metric("Avg Order Value", f"${avg_order_value:,.2f}")

trend = (
    filtered.groupby("Month", as_index=False)[["Sales", "Profit"]]
    .sum()
)
trend["Month"] = pd.Categorical(trend["Month"], categories=month_order, ordered=True)
trend = trend.sort_values("Month")

left, right = st.columns([2, 1])

with left:
    st.subheader("Sales Trend")
    render_tour_popover("sales_trend")
    st.line_chart(trend.set_index("Month")[["Sales", "Profit"]])

with right:
    st.subheader("Sales by Region")
    render_tour_popover("sales_by_region")
    region_summary = filtered.groupby("Region", as_index=False)["Sales"].sum()
    st.bar_chart(region_summary.set_index("Region"))

st.subheader("Detail Table")
render_tour_popover("detail_table")
st.dataframe(filtered, use_container_width=True, hide_index=True)

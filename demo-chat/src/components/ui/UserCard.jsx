import PropTypes from "prop-types";
import { Link } from "react-router-dom";

function UserCard({ to, onClick, children }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className="block p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
        >
            {children}
        </Link>
    );
}

UserCard.propTypes = {
    to: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    onClick: PropTypes.func,
    children: PropTypes.node.isRequired,
};

export default UserCard;

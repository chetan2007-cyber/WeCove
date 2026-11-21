const paginate = async (model, query, reqQuery) => {
    // Parse page and limit from the URL, with safe defaults
    const page = parseInt(reqQuery.page, 10) || 1;
    const limit = parseInt(reqQuery.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Execute query with skip and limit
    const results = await model.find(query).skip(skip).limit(limit).populate('collegeId', 'name');

    // Get total count for frontend math
    const total = await model.countDocuments(query);

    return {
        results,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1
        }
    };
};

module.exports = paginate;
// lambda - a lambda calulator which operates on the HTML-DOM

var lambda =
function ()
{
	// conjoined test for all expression types
	this.expression_p =
	function (node)
	{
		return (node && this.element_p(node) && (this.var_p(node) || this.abstraction_p(node) || this.application_p(node))) ? true : false;
	}

	// allows us to ignore "White Space"
	this.element_p =
	function (node)
	{
		return (node.nodeType == 1) ? true : false;
	}

	// tokens are only what returns true for element_p
	// I tried doing this by iterating over the childNodes list
	// but it actually increased the runtime
	this.first_element_token =
	function (node)
	{
		var first_token = node.firstChild;

		// inline element_p() call here to avoid a context switch...
		while(first_token && first_token.nodeType != 1)
		{
			first_token = first_token.nextSibling;
		}

		return first_token;
	}

	// pass the result of first_element_token here to get the next
	// token
	this.next_element_token =
	function (node)
	{
		var next_token = node.nextSibling;

		while(next_token && !this.element_p(next_token))
		{
			next_token = next_token.nextSibling;
		}

		return next_token;
	}

	// variable predicate
	this.var_p =
	function (node)
	{
		return node.tagName === "VAR" ? true : false;
	}

	// two variables are the same if they have the same name
	this.same_var_p =
	function (x,y)
	{
		return (this.var_p(x) && this.var_p(y) && (x.textContent === y.textContent)) ? true : false;
	}

	// renames variable with a prime
	this.prime_rewrite_var =
	function (x)
	{
		if(!this.var_p)
		{
			return false;
		}

		x.textContent = x.textContent + "\u2032";
		return true;
	}

	this.expand_var =
	function (v,environment)
	{
		var expansion = environment.getElementById(v.textContent);

		if(expansion)
		{
			return this.first_element_token(expansion);
		}

		return v;
	}

	// lambda abstraction (function definition) predicate
	this.abstraction_p =
	function (node)
	{
		var has_term = false, 
				has_body = false;

		if(node.tagName === "DL")
		{
			var inner_node = this.first_element_token(node);

			if(inner_node.tagName === "DT")
			{
				var lambda = this.first_element_token(inner_node);
				has_term = this.var_p(lambda);
			}

			inner_node = this.next_element_token(inner_node);
			
			if(inner_node.tagName === "DD")
			{
				var M = this.first_element_token(inner_node);
				has_body = this.expression_p(M);
			}
		}
		return (has_term && has_body) ? true : false;
	}

	// accessor for the term of the expression
	// \x. body <-- x is the term
	this.abstraction_term =
	function (node)
	{
		return this.first_element_token(this.first_element_token(node));
	}

	// accessor fot the body of the expression
	// \x. body <-- body is the body
	this.abstraction_body =
	function (node)
	{
		return this.first_element_token(this.next_element_token(this.first_element_token(node)));
	}

	// lambda application (function application) predicate
	this.application_p =
	function (node)
	{
		var has_e1 = false,
				has_e2 = false;

		if(node.tagName === "OL")
		{
			var inner_node = this.first_element_token(node);

			if(inner_node.tagName === "LI")
			{
				var M = this.first_element_token(inner_node);
				has_e1 = this.expression_p(M);
			}

			inner_node = this.next_element_token(inner_node);

			if(inner_node.tagName === "LI")
			{
				var N = this.first_element_token(inner_node);
				has_e2 = this.expression_p(N);
			}
		}
		return (has_e1 && has_e2) ? true : false;
	}

	// please check that node passes application_p first
	// (perhaps left-hand-side and right-hand-side are better names, but too long!)
	this.application_head =
	function (node)
	{
		return this.first_element_token(this.first_element_token(node));
	}

	// this one too
	this.application_tail =
	function (node)
	{
		return this.first_element_token(this.next_element_token(this.first_element_token(node)));
	}

	this.tree_map =
	function (node, func)
	{
		func(node);
		node = node.firstChild;
		while (node)
		{
			this.tree_map(node,func);
			node = node.nextSibling;
		}
	}

	this.substitute_term_in_expression =
	function (term,expression,to)
	{
		var lambda = this;	
		this.tree_map(expression, function (node)
		{
			if(lambda.var_p(node) && lambda.same_var_p(term,node))
			{
				if(node.parentNode)
				{
					node.parentNode.replaceChild(to.cloneNode(true),node);
				}
				else
				{
					while(node.childNodes.length)
					{
						node.removeChild(node.firstChild);
					}
					for(var c = 0; c < to.childNodes.length; c++)
					{
						node.appendChild(to.childNodes[c].cloneNode(true));
					}
				}
			}
		});
	}

	// test is variable x occurs free in expression
	this.occurs_free =
	function (expression,x)
	{
		if(!this.var_p(x))
		{
			return false;
		}

		if(this.var_p(expression))
		{
			return this.same_var_p(expression,x) ? true : false;
		}
		else if(this.application_p(expression))
		{
			return (this.occurs_free(this.application_head(expression),x) || this.occurs_free(this.application_tail(expression),x)) ? true : false;
		}
		else if(this.abstraction_p(expression))
		{
			return (!this.same_var_p(this.abstraction_term(expression),x) && this.occurs_free(this.abstraction_body(expression),x)) ? true : false;
		}
		return false;
	}

	// test if variable x is bound in expression
	this.occurs_bound =
	function (expression,x)
	{
		if(!this.var_p(x))
		{
			return false;
		}

		if(this.var_p(expression))
		{
			// console.log("No variable occurs bound in an expression consisting of a single variable or constant.");
			return false;
		}

		if(this.application_p(expression))
		{
			return (this.occurs_bound(this.application_head(expression),x) || this.occurs_bound(this.application_tail(expression),x)) ? true : false;
		}
		else if(this.abstraction_p(expression))
		{
			return (this.same_var_p(this.abstraction_term(expression),x) || this.occurs_bound(this.abstraction_body(expression),x)) ? true : false;
		}
		return false;
	}

	this.compute_toplevel =
	function (toplevel)
	{
		var inner_node = this.first_element_token(toplevel);

		while(inner_node)
		{
			var keep_reducing = true;	
			var redex = null;
			while(keep_reducing) 
			{
				if(redex === null)
				{
					redex = this.find_next_redex(inner_node,document);
					if(!redex || !inner_node.parentNode)
					{
						keep_reducing = false;
					}
				}
				else
				{
					if(redex = this.reduce(redex,document)) 
					{
						if(redex.parentNode)
						{
							redex = this.find_next_redex(redex,document);
						}
						else
						{
							redex = null;
						}
					}
				}
			}
			inner_node = this.next_element_token(inner_node);
		}
	}

	this.find_next_redex =
	function (node, environment)
	{
		var redex = null;
		if(this.application_p(node))
		{
			var head = this.application_head(node),
					tail = this.application_tail(node);
			if(this.abstraction_p(head))
			{
				redex = node;
			}
			else if(this.var_p(head))
			{
				var expansion = this.expand_var(head,environment);
				if(head !== expansion)
				{
					this.substitute_term_in_expression(head,node,expansion);
					redex = node;
				}

				if(this.application_p(tail) || this.abstraction_p(tail))
				{
					redex = this.find_next_redex(tail,environment);
				}
			}
			else
			{
				redex = this.find_next_redex(head,environment);
				if(!redex)
				{
					redex = this.find_next_redex(tail,environment);
				}
			}
		}
		else if(this.abstraction_p(node))
		{
			redex = this.find_next_redex(this.abstraction_body(node),environment);
		}

		return redex;
	}

	this.reduce =
	function (redex, env)
	{
		if(redex)
		{
			var abstraction = this.application_head(redex),
					subst_term = this.application_tail(redex);

			var expanded_var = null;
			if(this.var_p(abstraction))
			{
				expanded_var = this.expand_var(abstraction,env);
				if(this.var_p(expanded_var))
				{
					if(expanded_var === abstraction)
					{
						return null;
					}

					while(this.var_p(expanded_var))
					{
						abstraction = expanded_var;
						expanded_var = this.expand_var(expanded_var,env);
						if(abstraction === expanded_var)
						{
							return null;
						}
					}
				}
				abstraction = expanded_var;
			}

			while(this.occurs_bound(abstraction,subst_term))
			{
				if(!this.prime_rewrite_var(subst_term))
				{
					return null;
				}
			}

			var lambda_term = this.abstraction_term(abstraction),
					lambda_body = this.abstraction_body(abstraction),
					new_body = lambda_body.cloneNode(true);

			this.substitute_term_in_expression(lambda_term,new_body,subst_term);

			redex.parentNode.replaceChild(new_body,redex);

			redex = null;
			subst_term = null;
			return new_body;
		}
	}
};

var prelude = new lambda();
